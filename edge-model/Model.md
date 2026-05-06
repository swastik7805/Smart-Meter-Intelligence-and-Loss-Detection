# GridMind Edge-AI Model Architecture

## Overview
The GridMind anomaly detection engine uses an **Ultra-lightweight Welford's Online Z-Score Statistical Model**. It is specifically designed for Edge-AI environments (e.g., deploying directly on a smart meter's constrained microcontroller) because it requires zero heavy dependencies like TensorFlow, PyTorch, or Scikit-learn.

It operates using an **Online Learning** paradigm. This means it does not require a pre-trained dataset or historical batch processing. Instead, it learns the unique consumption baseline of each smart meter dynamically in real-time as the data streams in.

## How it Works (The Workflow)

### 1. Data Ingestion
The Edge API receives a continuous stream of JSON payloads containing the meter's ID, location coordinates, and current power consumption in kWh.

### 2. Welford's Online Algorithm (Mean & Variance)
Electricity consumption is continuous data. Instead of forcing it into discrete bins (which creates inaccurate boundaries), the model uses Welford's method to calculate the **running mean (μ)** and **running standard deviation (σ)** in a single pass. 
- It updates the mathematical baseline of the meter in `O(1)` time and `O(1)` memory. 
- It stores only 3 variables per meter: `count`, `mean`, and `m2` (sum of squares of differences).

### 3. Warm-up Phase
A smart meter's baseline cannot be known instantly. For the first 20 readings (`WARMUP_READINGS = 20`), the model observes the data silently. It learns the baseline without making any anomaly predictions to prevent false positives while its statistical memory is forming.

### 4. Z-Score Calculation & Prediction
After the warm-up phase, when a new reading arrives, the model calculates its **Z-Score** before updating the running baseline. 
`Z-Score = |Current_Reading - Running_Mean| / Standard_Deviation`
The Z-Score tells us exactly how many standard deviations the reading is away from the meter's normal behavior. 

- **Normal Operation**: If the Z-Score is `< 3.0`, the reading is considered normal. The model marks it as normal and updates its baseline memory.
- **Anomaly Detection**: If the Z-Score is `≥ 3.0` (the 3-sigma rule), it violates the Empirical Rule of normal distribution, meaning the event is highly abnormal. 
  - *Example 1 (Theft/Bypass)*: A sudden drop to `0.01` kWh.
  - *Example 2 (Tampering/Fault)*: A massive spike to `99.9` kWh.

### 5. Dynamic Severity & Confidence Calculation
Instead of a fixed severity, the model dynamically scales based on the severity of the mathematical deviation:
- **Severity Levels**:
  - `MEDIUM`: $Z \ge 3.0$
  - `HIGH`: $Z \ge 5.0$
  - `CRITICAL`: $Z \ge 10.0$ (Statistically near-impossible under normal conditions)
- **Confidence Score**: The probability of it being a true anomaly scales with the Z-score using the formula: `Confidence = min(99%, 1.0 - (3.0 / Z))`. For example, a Z-score of 3 gives a 0% baseline confidence, while a Z-score of 30 gives a 90%+ confidence.

### 6. Database Persistence
If an anomaly is flagged, the model computes the dynamic confidence score, assigns the dynamic severity level, and immediately pushes the event to the PostgreSQL/PostGIS database. This makes the anomaly instantly visible on the live monitoring dashboard.

---

## Why this Algorithm? (Key Advantages)
* **O(1) Time Complexity**: Fetching and updating the variance mathematically takes constant time, making inference lightning fast.
* **O(1) Memory Footprint**: It only stores three variables per meter, avoiding the need to store historical arrays or large frequency distribution tables.
* **Solves the Integer Cliff Problem**: Naturally processes continuous floating-point metrics (kWh) without artificial "rounding" boundaries.
* **Per-Meter Isolation**: Every meter builds its own unique mathematical baseline. This ensures that a factory's normal high-power consumption isn't falsely flagged against a residential home's low-power baseline.

---

## Future Scope: Advanced Machine Learning Integration

While the Welford model is incredibly fast and perfect for edge devices, it primarily detects **point anomalies** (sudden isolated spikes or drops). To make the system robust against **contextual anomalies** (e.g., normal usage but at the wrong time of day) and **collective anomalies** (e.g., slow, gradual meter tampering), we can integrate more sophisticated algorithms using historical datasets in a central cloud environment:

### 1. Isolation Forest (Unsupervised Learning)
* **How it works:** It builds an ensemble of Random Trees to "isolate" observations. Anomalies are easier to isolate because they are rare and different, resulting in shorter path lengths in the trees.
* **Why use it:** Perfect for multi-dimensional anomaly detection. Instead of just looking at `kWh`, it can find anomalies in combinations of `kWh`, `temperature`, `time_of_day`, and `voltage`.

### 2. ARIMA / SARIMA (Time-Series Forecasting)
* **How it works:** AutoRegressive Integrated Moving Average predicts the next expected consumption value based on past trends and seasonality. 
* **Why use it:** Great for contextual anomalies. If a house always consumes 2 kWh at 3 AM, and suddenly consumes 8 kWh at 3 AM, ARIMA will flag it because the actual value drastically deviates from the forecasted curve.

### 3. One-Class SVM
* **How it works:** Support Vector Machines try to draw a tightly fitted hyperplane boundary around the "normal" data points in a high-dimensional space.
* **Why use it:** Highly effective for semi-supervised datasets where we have plenty of "normal" data but very few labeled examples of actual "theft" or "tampering".

### 4. Deep Learning (LSTMs & Autoencoders)
* **How it works:** Long Short-Term Memory (LSTM) networks can remember long sequences of data.
* **Why use it:** Essential for catching "collective anomalies", such as a slow, deliberate bypass of a meter over weeks (e.g., usage drops by 1% every day). LSTMs can learn complex, non-linear household behavior patterns flawlessly.

### Proposed Hybrid Architecture
In the future, GridMind can use a **Hybrid Approach**:
1. **Edge Level (Microcontroller):** The current Welford Z-Score Model runs directly on the smart meter for instant, real-time alerts.
2. **Cloud Level (Central Server):** A periodic batch job runs advanced models like Isolation Forest or LSTMs on aggregated historical data to catch subtle, long-term theft patterns that the edge model might miss.