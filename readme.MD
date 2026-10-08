# Sat_short 🔗

A lightweight, fast URL Shortener with temporary link expiration and IP-based rate limiting, built with **Node.js**, **Express**, and **Redis**.

---

## 🎯 Purpose of this Project

This project was built as a hands-on learning lab to deeply understand and implement core **Redis** concepts in a real-world backend application.

Specifically, it explores:
1. **In-Memory Caching & Storage**: Super-fast key-value retrieval for URL redirection.
2. **Key Expiration & TTL (Time To Live)**: Auto-expiring temporary short links without background cleanup jobs.
3. **Sliding Window Rate Limiting**: Distributed request rate limiting using Redis **Sorted Sets (`ZSET`)** to prevent abuse.

---

## 🚀 Features & Redis Concepts Learned

### 1. URL Shortening with Custom TTL (Expiration)
- **Concept**: Ephemeral Key-Value Caching (`SET` with `EX`, `GET`).
- **How it works**:
  - When a user submits a long URL with an expiration duration (in seconds), an 8-character hex identifier is generated using Node's `crypto` module.
  - The URL mapping is saved in Redis under the key `url:<id>` with an explicit expiration:
    ```javascript
    await client.set(`url:${id}`, longUrl, { expiration: { type: 'EX', value: time } });
    ```
  - When someone visits `/:id`, Redis fetches the original URL using `client.get(\`url:${id}\`)`. If the TTL has expired, Redis automatically evicts the key and the server returns `404 URL Not Found`.

### 2. Sliding Window Log Rate Limiter
- **Concept**: Distributed Rate Limiting with Redis Sorted Sets (`ZSET`).
- **Why Sliding Window?**: Unlike fixed window limiters (which can allow 2x traffic bursts at window boundaries), the sliding window log provides precise, smooth rate limiting across rolling time frames.
- **How it works**:
  - Each incoming request is tracked under `rate:<ip>`.
  - Timestamps are used as the sorted set score:
    1. **Prune Old Requests**: Remove entries older than the rolling window (e.g., 60 seconds):
       ```javascript
       await client.zRemRangeByScore(key, 0, now - window);
       ```
    2. **Count Requests**: Check how many requests occurred in the current window:
       ```javascript
       const count = await client.zCard(key);
       ```
    3. **Enforce Limit**: If `count >= 5`, return `429 Too Many Requests`.
    4. **Record Request**: Add the current timestamp into the sorted set:
       ```javascript
       await client.zAdd(key, { score: now, value: `${now}-${uniqueId}` });
       ```
    5. **Set Key Expiration**: Refresh the key TTL so inactive IP records are automatically garbage-collected:
       ```javascript
       await client.expire(key, 60);
       ```

---

## 🛠️ Tech Stack

- **Runtime**: [Node.js](https://nodejs.org/) (ES Modules)
- **Framework**: [Express 5](https://expressjs.com/)
- **Database / Cache**: [Redis](https://redis.io/) (via `redis` client)
- **Security / Utility**: Node.js `crypto` (for secure random token generation) & `dotenv` (environment configuration)

---

## 📡 API Reference

### 1. Shorten a URL
- **Endpoint**: `POST /url/shortening`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "longUrl": "https://example.com/very/long/url",
    "time": 300
  }
  ```
  *(Note: `time` is the expiration duration in seconds)*
- **Response** (`200 OK`):
  ```json
  {
    "url": "http://localhost:3000/a1b2c3d4"
  }
  ```

### 2. Redirect to Original URL
- **Endpoint**: `GET /:id`
- **Response**:
  - `302 Found`: Redirects to the stored long URL.
  - `404 Not Found`: Returned if the URL does not exist or has expired.

### 3. Rate Limit Exceeded
- **Response** (`429 Too Many Requests`):
  ```json
  {
    "message": "Too many requests"
  }
  ```

---

## ⚙️ Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- A running [Redis](https://redis.io/) server instance (locally or via Docker)

#### Running Redis with Docker (optional):
```bash
docker run -d --name redis-local -p 6379:6379 redis:alpine
```

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/satya-no17/Sat_short.git
   cd Sat_short
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   URL=http://localhost:3000/
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. Access the app at `http://localhost:3000/`.

---

## 🧠 Key Learnings Summary

- **High-Throughput In-Memory Lookups**: Why Redis is ideal for URL redirection and real-time mapping over traditional relational databases.
- **TTL & Expiry Management**: Eliminates manual database purge jobs by leveraging Redis passive and active key expiration.
- **Advanced Data Structures**: Going beyond simple strings to use Redis Sorted Sets (`ZSET`) for robust sliding-window rate limiting algorithms.
