*Title*

`GridMind: Edge-AI Time-Series Anomaly Detection for Power Theft`

## Description

### 1. Core Problem Statement
Power distribution companies (such as `BESCOM`) suffer massive revenue deficits due to Non-Technical Losses (`NTL`), specifically physical meter tampering and direct line tapping. While modern smart meters provide 15-minute interval telemetry, this high-frequency streaming from millions of endpoints creates an unmanageable data deluge. Centralized cloud processing of this raw data is computationally expensive and introduces severe latency, meaning physical theft is often only detected weeks after it occurs. By the time an anomaly is manually verified, the financial loss has already been incurred and the perpetrators have often moved on.

### 2. Proposed Architecture & Solution
We propose an edge-optimized AI architecture utilizing time-series anomaly detection models (such as `LSTMs` or `Isolation Forests`) to identify power theft in near real-time. By processing high-frequency data intelligently, the system analyzes historical consumption baselines and autonomously flags abrupt, localized voltage drops or specific consumption signatures that match known tampering patterns. These high-confidence alerts are immediately routed to a centralized `PostgreSQL` database with `PostGIS` spatial extensions, and visualized on a dynamic `Next.js` web dashboard. This allows grid operators to bypass the noise and dispatch line crews with pinpoint accuracy immediately after a theft event begins.

## Theme
Theme 8: AI for Smart Meter Intelligence & Loss Detection by BESCOM