# GridMind Edge-AI Model Architecture

## Overview
The GridMind anomaly detection engine uses an **Ultra-lightweight Monte Carlo / Frequency-based Statistical Model**. It is specifically designed for Edge-AI environments (e.g., deploying directly on a smart meter's constrained microcontroller) because it requires zero heavy dependencies like TensorFlow, PyTorch, or Scikit-learn.

It operates using an **Online Learning** paradigm. This means it does not require a pre-trained dataset or historical batch processing. Instead, it learns the unique consumption baseline of each smart meter dynamically in real-time as the data streams in.

## How it Works (The Workflow)

### 1. Data Ingestion
The Edge API receives a continuous stream of JSON payloads containing the meter's ID, location coordinates, and current power consumption in kWh.

### 2. Data Binning (Rounding)
Because electricity consumption is a continuous floating-point value (e.g., 5.12 kWh, 5.34 kWh), comparing exact decimals is statistically flawed. To fix this, the model rounds the reading to the nearest integer (the "bin"). This groups normal fluctuations together, allowing a stable statistical distribution to form for normal usage.

### 3. Frequency Calculation
The model acts as a memory bank and updates two hash maps for the specific meter:
- `total_count`: The total number of readings received from this meter so far.
- `freq_table`: The total number of times this specific kWh bin has been seen for this meter.

It then calculates the probability (historical frequency) of the current reading:
`Frequency = (Count of this Bin) / (Total Readings)`

### 4. Warm-up Phase
A smart meter's baseline cannot be known instantly. For the first 20 readings (`WARMUP_READINGS = 20`), the model observes the data silently. It learns the baseline without making any anomaly predictions to prevent false positives while its memory is blank.

### 5. Prediction & Flagging
After the warm-up phase, the model compares the calculated `Frequency` against a strict alert threshold (`ALERT_THRESHOLD = 0.05` or 5%).
- **Normal Operation (`label: normal`)**: If the reading has a high frequency (e.g., it falls within the meter's normal baseline of 4-6 kWh), the model marks it as normal and updates its memory.
- **Anomaly Detection (`label: anomaly`)**: If the reading has a frequency below 5%, it means this consumption level is highly unusual based on historical context. 
  - *Example 1 (Theft/Bypass)*: A sudden drop to `0.01` kWh.
  - *Example 2 (Tampering/Fault)*: A massive spike to `99.9` kWh.
  These extreme values will fall into unseen bins, resulting in a very low frequency, triggering the alert.

### 6. Database Persistence
If an anomaly is flagged, the model computes a confidence score (`1 - freq`), assigns a severity level, and immediately pushes the event to the PostgreSQL/PostGIS database. This makes the anomaly instantly visible on the live monitoring dashboard.

---

## Why this Algorithm? (Key Advantages)
* **O(1) Time Complexity**: Fetching and updating frequency from a Python `defaultdict` takes constant time, making inference lightning fast.
* **Minimal Memory Footprint**: Instead of storing the entire time-series history in an array, it only stores aggregate integer counters per bin.
* **Per-Meter Isolation**: Every meter builds its own unique mathematical baseline. This ensures that a factory's normal high-power consumption isn't falsely flagged against a residential home's low-power baseline.

---

## Future Scope: Advanced Machine Learning Integration

While the frequency-based model is incredibly fast and perfect for edge devices, it primarily detects **point anomalies** (sudden isolated spikes or drops). To make the system robust against **contextual anomalies** (e.g., normal usage but at the wrong time of day) and **collective anomalies** (e.g., slow, gradual meter tampering), we can integrate more sophisticated algorithms using historical datasets in a central cloud environment:

### 1. Isolation Forest (Unsupervised Learning)
* **How it works:** It builds an ensemble of Random Trees to "isolate" observations. Anomalies are easier to isolate because they are rare and different, resulting in shorter path lengths in the trees.
* **Why use it:** Perfect for multi-dimensional anomaly detection. Instead of just looking at `kWh`, it can find anomalies in combinations of `kWh`, `temperature`, `time_of_day`, and `voltage`.

### 2. ARIMA / SARIMA (Time-Series Forecasting)
* **How it works:** AutoRegressive Integrated Moving Average (ARIMA) predicts the next expected consumption value based on past trends and seasonality. 
* **Why use it:** Great for contextual anomalies. If a house always consumes 2 kWh at 3 AM, and suddenly consumes 8 kWh at 3 AM, ARIMA will flag it because the actual value drastically deviates from the forecasted curve, even if 8 kWh is perfectly "normal" during the day.

### 3. One-Class SVM
* **How it works:** Support Vector Machines try to draw a tightly fitted hyperplane boundary around the "normal" data points in a high-dimensional space.
* **Why use it:** Highly effective for semi-supervised datasets where we have plenty of "normal" data but very few labeled examples of actual "theft" or "tampering". Any new reading falling outside this learned boundary is instantly flagged.

### 4. Deep Learning (LSTMs & Autoencoders)
* **How it works:** Long Short-Term Memory (LSTM) networks can remember long sequences of data. Autoencoders learn to compress and reconstruct normal data; if they fail to reconstruct a new sequence accurately, it's flagged as an anomaly.
* **Why use it:** Essential for catching "collective anomalies", such as a slow, deliberate bypass of a meter over weeks (e.g., usage drops by 1% every day). LSTMs can learn complex, non-linear household behavior patterns flawlessly.

### Proposed Hybrid Architecture
In the future, GridMind can use a **Hybrid Approach**:
1. **Edge Level (Microcontroller):** The current Frequency Model runs directly on the smart meter for instant, real-time alerts.
2. **Cloud Level (Central Server):** A periodic batch job runs advanced models like Isolation Forest or LSTMs on aggregated historical data to catch subtle, long-term theft patterns that the edge model might miss.
