package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gorilla/websocket"
)

var (
	secret    = os.Getenv("WEBHOOK_SECRET")
	distDir   = getEnv("DIST_DIR", "/home/exedev/the_masked_garden/game/dist")
	repoDir   = getEnv("REPO_DIR", "/home/exedev/the_masked_garden")
	lastBuild = time.Now()
	buildMu   sync.RWMutex
)

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

var playerIDCounter uint64

type PlayerState struct {
	X  float64 `json:"x"`
	Y  float64 `json:"y"`
	Z  float64 `json:"z"`
	VX float64 `json:"vx"`
	VY float64 `json:"vy"`
	VZ float64 `json:"vz"`
}

type Player struct {
	ID       uint64
	conn     *websocket.Conn
	lastPing time.Time
	state    PlayerState
	mu       sync.Mutex
}

var (
	players   = make(map[*websocket.Conn]*Player)
	playersMu sync.RWMutex
)

type WSMessage struct {
	Type        string                 `json:"type"`
	PlayerCount int                    `json:"playerCount,omitempty"`
	ID          uint64                 `json:"id,omitempty"`
	State       *PlayerState           `json:"state,omitempty"`
	Players     map[uint64]PlayerState `json:"players,omitempty"`
	BuildTime   string                 `json:"buildTime,omitempty"`
}

func broadcastPlayerCount() {
	playersMu.RLock()
	count := len(players)
	conns := make([]*websocket.Conn, 0, len(players))
	for conn := range players {
		conns = append(conns, conn)
	}
	playersMu.RUnlock()

	msg := WSMessage{Type: "playerCount", PlayerCount: count}
	data, _ := json.Marshal(msg)

	for _, conn := range conns {
		conn.WriteMessage(websocket.TextMessage, data)
	}
}

func broadcastPlayerLeft(id uint64) {
	playersMu.RLock()
	conns := make([]*websocket.Conn, 0, len(players))
	for conn := range players {
		conns = append(conns, conn)
	}
	playersMu.RUnlock()

	msg := WSMessage{Type: "playerLeft", ID: id}
	data, _ := json.Marshal(msg)

	for _, conn := range conns {
		conn.WriteMessage(websocket.TextMessage, data)
	}
}

func broadcastBuildTime() {
	playersMu.RLock()
	conns := make([]*websocket.Conn, 0, len(players))
	for conn := range players {
		conns = append(conns, conn)
	}
	playersMu.RUnlock()

	buildMu.RLock()
	buildTimeStr := lastBuild.UTC().Format(time.RFC3339)
	buildMu.RUnlock()

	msg := WSMessage{Type: "buildTime", BuildTime: buildTimeStr}
	data, _ := json.Marshal(msg)

	for _, conn := range conns {
		conn.WriteMessage(websocket.TextMessage, data)
	}
}

func broadcastPlayerStates() {
	for {
		time.Sleep(200 * time.Millisecond) // 5Hz

		playersMu.RLock()
		if len(players) < 2 {
			playersMu.RUnlock()
			continue
		}

		states := make(map[uint64]PlayerState)
		conns := make(map[*websocket.Conn]uint64)
		for conn, player := range players {
			player.mu.Lock()
			states[player.ID] = player.state
			player.mu.Unlock()
			conns[conn] = player.ID
		}
		playersMu.RUnlock()

		for conn, myID := range conns {
			otherStates := make(map[uint64]PlayerState)
			for id, state := range states {
				if id != myID {
					otherStates[id] = state
				}
			}
			if len(otherStates) > 0 {
				msg := WSMessage{Type: "players", Players: otherStates}
				data, _ := json.Marshal(msg)
				conn.WriteMessage(websocket.TextMessage, data)
			}
		}
	}
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}

	id := atomic.AddUint64(&playerIDCounter, 1)
	player := &Player{ID: id, conn: conn, lastPing: time.Now()}

	playersMu.Lock()
	players[conn] = player
	playersMu.Unlock()

	// Send player their ID and current build time
	buildMu.RLock()
	buildTimeStr := lastBuild.UTC().Format(time.RFC3339)
	buildMu.RUnlock()

	welcomeMsg := WSMessage{Type: "welcome", ID: id, BuildTime: buildTimeStr}
	welcomeData, _ := json.Marshal(welcomeMsg)
	conn.WriteMessage(websocket.TextMessage, welcomeData)

	log.Printf("Player %d connected. Total: %d", id, len(players))
	broadcastPlayerCount()

	defer func() {
		playersMu.Lock()
		delete(players, conn)
		playersMu.Unlock()
		conn.Close()
		log.Printf("Player %d disconnected. Total: %d", id, len(players))
		broadcastPlayerLeft(id)
		broadcastPlayerCount()
	}()

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			break
		}

		var msg WSMessage
		if json.Unmarshal(message, &msg) == nil {
			switch msg.Type {
			case "ping":
				playersMu.Lock()
				if p, ok := players[conn]; ok {
					p.lastPing = time.Now()
				}
				playersMu.Unlock()
				conn.WriteMessage(websocket.TextMessage, []byte(`{"type":"pong"}`))

			case "state":
				if msg.State != nil {
					playersMu.RLock()
					if p, ok := players[conn]; ok {
						p.mu.Lock()
						p.state = *msg.State
						p.mu.Unlock()
					}
					playersMu.RUnlock()
				}
			}
		}
	}
}

func cleanupStaleConnections() {
	for {
		time.Sleep(2 * time.Second)
		now := time.Now()
		var stale []*websocket.Conn
		var staleIDs []uint64

		playersMu.RLock()
		for conn, player := range players {
			if now.Sub(player.lastPing) > 5*time.Second {
				stale = append(stale, conn)
				staleIDs = append(staleIDs, player.ID)
			}
		}
		playersMu.RUnlock()

		for i, conn := range stale {
			playersMu.Lock()
			delete(players, conn)
			playersMu.Unlock()
			conn.Close()
			log.Printf("Cleaned up stale player %d. Total: %d", staleIDs[i], len(players))
			broadcastPlayerLeft(staleIDs[i])
		}

		if len(stale) > 0 {
			broadcastPlayerCount()
		}
	}
}

func verifySignature(payload []byte, signature string) bool {
	if secret == "" {
		return true
	}
	if !strings.HasPrefix(signature, "sha256=") {
		return false
	}
	sig, err := hex.DecodeString(signature[7:])
	if err != nil {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	return hmac.Equal(sig, mac.Sum(nil))
}

func webhookHandler(w http.ResponseWriter, r *http.Request) {
	payload, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read body", http.StatusBadRequest)
		return
	}

	sig := r.Header.Get("X-Hub-Signature-256")
	if !verifySignature(payload, sig) {
		log.Println("Invalid signature")
		http.Error(w, "Invalid signature", http.StatusUnauthorized)
		return
	}

	event := r.Header.Get("X-GitHub-Event")
	log.Printf("Received webhook event: %s", event)

	if event == "push" {
		go func() {
			log.Println("Pulling latest changes...")
			cmd := exec.Command("git", "-C", repoDir, "pull", "--ff-only")
			output, err := cmd.CombinedOutput()
			if err != nil {
				log.Printf("Git pull failed: %v\n%s", err, output)
				return
			}
			log.Printf("Git pull succeeded:\n%s", output)

			log.Println("Rebuilding...")
			cmd = exec.Command("bash", "-c", fmt.Sprintf("cd %s/game && export PNPM_HOME=/home/exedev/.local/share/pnpm && export PATH=$PNPM_HOME:$PATH && pnpm install && pnpm build", repoDir))
			output, err = cmd.CombinedOutput()
			if err != nil {
				log.Printf("Build failed: %v\n%s", err, output)
				return
			}
			log.Println("Build succeeded")

			// Update build time and notify all clients
			buildMu.Lock()
			lastBuild = time.Now()
			buildMu.Unlock()
			broadcastBuildTime()
		}()
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, "OK")
}

func main() {
	go cleanupStaleConnections()
	go broadcastPlayerStates()

	fs := http.FileServer(http.Dir(distDir))

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/__webhook" && r.Method == "POST" {
			webhookHandler(w, r)
			return
		}

		if r.URL.Path == "/ws" {
			handleWebSocket(w, r)
			return
		}

		path := distDir + r.URL.Path
		if _, err := os.Stat(path); os.IsNotExist(err) && !strings.Contains(r.URL.Path, ".") {
			http.ServeFile(w, r, distDir+"/index.html")
			return
		}

		fs.ServeHTTP(w, r)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}
	log.Printf("Server listening on :%s, serving %s", port, distDir)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
