# ⚡ GridMind: Edge-AI Smart Meter Anomaly Detection

**GridMind** is a real-time, edge-computing solution designed to instantly detect electricity theft, meter tampering, and grid faults. Instead of sending heavy streams of raw telemetry data to a central server, GridMind processes data directly at the edge (on the smart meter itself) and only transmits critical alerts to the central dashboard.

---

## 🧠 Current Statistical Model (Edge Engine)

Deploying heavy Machine Learning models (like Neural Networks) on edge devices is expensive and slow. GridMind currently solves this using an **Ultra-lightweight Monte Carlo / Frequency-Based Statistical Model**:

- **Online Learning:** The model does not require pre-training. It observes the first 20 readings of any meter (Warm-up Phase) to establish a mathematical baseline dynamically.
- **Data Binning:** Continuous floating-point readings (e.g., 5.12 kWh) are grouped into bins (nearest integer).
- **O(1) Time Complexity:** It calculates the historical frequency of every reading in constant time. If a new reading falls into a bin that occurs less than 5% of the time (e.g., a sudden drop to 0.01 kWh), it is instantly flagged as an anomaly.

---

## 🏗️ Microservice Architecture

The project is broken down into three completely decoupled microservices:

1. **Edge-AI Node (Python / Flask)**
   - Simulates the microcontroller inside a smart meter.
   - Ingests a continuous stream of power consumption data (kWh).
   - Runs an ultra-lightweight anomaly detection algorithm.
   - *If* an anomaly is found, it pushes the data directly to the database.

2. **Central Database (PostgreSQL + PostGIS)**
   - Acts as the central nervous system storing flagged anomalies.
   - Uses PostGIS to store exact geographic coordinates (Lat/Lon) of the compromised meters for quick dispatch of inspection teams.

3. **Live Command Dashboard (Next.js 14)**
   - A modern, glassmorphism-styled React frontend.
   - Polls the database and visualizes anomalies in real-time.
   - Highlights high-severity alerts (like 99.9 kWh spikes or 0.0 kWh drops) allowing operators to take immediate action.

---


## 🚀 Future Roadmap: Advanced ML Integration

While the current edge model is incredibly fast and perfect for catching **point anomalies** (sudden isolated spikes or drops), future iterations will adopt a **Hybrid Architecture** (Edge + Cloud) to catch subtle, long-term theft patterns:

* **Isolation Forest:** To detect multidimensional anomalies by evaluating combinations of `kWh`, `temperature`, and `voltage`.
* **ARIMA / SARIMA:** For time-series forecasting to catch contextual anomalies (e.g., a high consumption level that is normal during the day, but highly anomalous at 3 AM).
* **One-Class SVM:** To mathematically draw a boundary around "normal" data and flag any reading that falls outside without needing labeled "theft" training data.
* **Deep Learning (LSTMs):** To run periodic batch-jobs on the central server. LSTMs can learn complex behavioral sequences to detect "collective anomalies" (e.g., a sophisticated meter bypass where consumption artificially drops by just 1% every day).

---

## 🛠️ Improvements & Pending Work

To make this system fully production-ready, the following improvements are planned:

1. **Message Queue Integration:** Replace direct PostgreSQL inserts from the edge with a message broker like **Apache Kafka** or **RabbitMQ** to handle millions of concurrent smart meter streams without bottlenecking the database.
2. **Pub/Sub or WebSockets for Dashboard:** Upgrade the Next.js dashboard from HTTP Polling (every 3 seconds) to a real-time WebSocket connection for instant UI updates.
3. **Interactive Maps:** Integrate Mapbox or Google Maps API on the dashboard to plot the PostGIS coordinates visually, rather than just displaying Lat/Lon text.
4. **Edge Security:** Implement JWT-based authentication for the `/predict` API to ensure only authorized smart meters can push data to the network.

---

## 💻 How to Run Locally

### 1. Start the Database
Ensure Docker Desktop is running, then start the PostGIS container:
```bash
docker-compose up -d
```

### 2. Start the Edge Model & API
```bash
cd edge-model
# Create and activate a virtual environment
python -m venv venv
# On Windows: .\venv\Scripts\activate
# On Mac/Linux: source venv/bin/activate

# Set up environment variables
cp .env.example .env

pip install -r requirements.txt
python app.py
```

### 3. Start the Data Simulator (in a new terminal)
```bash
cd edge-model
# Make sure your virtual environment is activated first!
# On Windows: .\venv\Scripts\activate
# On Mac/Linux: source venv/bin/activate

python simulator.py
```

### 4. Start the Dashboard (in a new terminal)
```bash
cd dashboard

# Set up environment variables
cp .env.local.example .env.local

npm install
npm run dev
```
*(Note: The database uses port 5433 by default to prevent conflicts with local PostgreSQL installations. If you still encounter conflicts, update the port in `docker-compose.yml`, `edge-model/.env`, and `dashboard/.env.local`).*

Open **http://localhost:3000** to view the live anomaly alerts!
