# FYP Backend

This repository contains the backend server code for the Final Year Project. It is a Node.js application that serves as an interface between the frontend, a PostgreSQL database, and a private blockchain network (Quorum/Besu) for secure log auditing and user management.

## Table of Contents
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [API Endpoints](#api-endpoints)
- [Smart Contract](#smart-contract)

## Features

* **User Authentication**: Secure login system using JWT (JSON Web Tokens) stored in HttpOnly cookies.
* **User Management**: Full CRUD operations for managing system users.
* **Blockchain Integration**: 
    * Writes immutable audit logs to a specific Smart Contract (`LogEmitter`) on the blockchain.
    * Retrieves logs filtered by server ID directly from blockchain events.
* **Database Integration**: Connects to a PostgreSQL database for storing user credentials and profiles.

## Prerequisites

* **Node.js**: Ensure you have a version compatible with the dependencies listed in `package.json`.
* **PostgreSQL**: A running instance of a Postgres database.
* **Blockchain Node**: Access to a running Quorum or Besu RPC node.

## Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```

## Configuration

Create a `.env` file in the root directory. The following environment variables are required based on the application code:

```env
# Server Configuration
PORT=3001
JWT_SECRET=your_jwt_secret  # Defaults to 'DEB' if not set
NODE_ENV=development        # Set to 'production' for secure cookies

# Database Configuration (PostgreSQL)
DB_USER=your_db_user
DB_HOST=your_db_host
DB_NAME=your_db_name
DB_PASSWORD=your_db_password
DB_PORT=5432

# Blockchain Configuration
CONTRACT_ADDRESS=0x...      # Deployed address of LogEmitter
CONTRACT_TX_HASH=0x...      # Transaction hash of the contract deployment