# 🧠 Smart Meter Anomaly Detection: Model Workflow & Hackathon Pitch Guide

Since you are presenting this as a prototype for the **AI for Bharat** hackathon, you need to know exactly what is happening under the hood. Here is a simplified, complete breakdown of the model, the data, and how to pitch it.

## 1. Data: Kahan Se Aaya aur Kya Hai? (Dataset Details)
* **Source:** The original repository explored data from Kaggle and a Swiss company (Solarify). 
* **Columns:** A typical smart meter dataset has columns like `Timestamp`, `Meter_ID`, and `kWh` (energy consumed).
* **How it's used in your prototype:** Your running prototype (`app.py`) **does not use a static CSV dataset**. Instead, it acts as a real-time streaming processor. It only cares about the **`kWh`** value. It assumes data is streaming in live from a smart meter every few minutes.

## 2. Algorithm: Kaunsa ML Model Use Hua Hai?
Even though the repository has notebooks testing complex models like ARIMA and Isolation Forests, the actual prototype deployed in `app.py` uses a **Monte Carlo / Frequency-based Statistical Model**.

* **No Neural Networks:** It is not a Deep Learning or Heavy ML model.
* **Why this algo?:** It is incredibly fast, extremely lightweight, and doesn't require a GPU. It is designed to be so efficient that it could run directly on a cheap edge device (like a Raspberry Pi inside the actual Smart Meter).

## 3. Training: Kya Training Ki Hai?
**No offline training was done for this specific prototype!** 

If you look at `app.py`, it starts with an empty dictionary (`appr = cl.defaultdict(float)`). This means the model uses **Online Learning**. 
* Every time a new `kWh` reading comes in via the API, the model "learns" it on the spot.
* It keeps a running tally of how many times it has seen a specific `kWh` value compared to the total number of readings it has ever received.
* **How it predicts:** If it receives a `kWh` value and calculates that its historical frequency is extremely low (below the `alert_threshold`), it flags it as an anomaly. 

*Example:* If the house usually uses `5.0 kWh`, the model learns this is "normal". If suddenly a `99.9 kWh` reading comes in, the model realizes this value has a frequency of ~0%, and immediately flags it.

---

## 🚀 Pitch Strategy for "AI for Bharat" Hackathon

Since you are borrowing this idea and need to present it as a unique prototype for India, here is how you should frame your pitch to the judges:

### A. Frame it as "Edge-AI for Rural/Semi-Urban Grids"
Don't say "we used a simple math formula." Instead, say: 
> *"We implemented an **Ultra-Lightweight, Real-Time Online Learning Algorithm**. We chose this over heavy Deep Learning because, in the Indian context (Bharat), smart meters in rural or semi-urban areas might have very low compute power and spotty internet. Our model doesn't need expensive cloud GPUs; it is so lightweight it can run directly on the Edge (inside the meter itself)."*

### B. Highlight "Adaptive Online Learning"
One of the biggest problems with ML is that models get outdated (Concept Drift). You should pitch that your model learns continuously:
> *"Unlike traditional ML models that need to be trained on massive historical datasets and then get outdated when seasons change, our prototype uses **Online Learning**. It builds a frequency distribution of energy usage in real-time. If a household buys a new AC in the summer, the model will initially flag the high usage, but will quickly **adapt** and learn that this is the new 'normal', without needing developer intervention."*

### C. Mention Future Scope (The "What's Next")
To show the judges you have a long-term vision, tell them:
> *"For this prototype, we implemented the live frequency-based model. In a production AI for Bharat deployment, we would combine this edge-model with a cloud-based **Isolation Forest** or **ARIMA** model (which we have explored in our research notebooks) to detect long-term seasonal anomalies across the entire power grid."*

### 📋 TL;DR Summary for your Demo
1. Run your server (`python app.py`).
2. Tell the judges you are simulating live data coming from a smart meter in an Indian household.
3. Send 5 normal readings (`curl` with `5.0 kWh`) and explain: *"The model is learning the baseline in real-time."*
4. Send the anomalous reading (`curl` with `99.9 kWh`) and show the model catching it instantly!
