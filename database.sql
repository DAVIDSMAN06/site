-- ═══════════════════════════════════════════════════════════
-- FIXMIND - DATABASE SCHEMA
-- Sistem educațional cu clase și evaluare
-- ═══════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS fixmind;
USE fixmind;

-- ═══════════════════════════════════════════════════════════
-- USERS TABLE - Toți utilizatorii (profesori + elevi)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    type ENUM('profesor', 'elev') NOT NULL,
    profile_picture VARCHAR(255),
    oauth_id VARCHAR(255),
    oauth_provider ENUM('google', 'facebook', 'local'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_type (type)
);

-- ═══════════════════════════════════════════════════════════
-- PROFESORI TABLE - Informații profesor
-- ═══════════════════════════════════════════════════════════
CREATE TABLE profesori (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    materia VARCHAR(100) NOT NULL,
    biografie TEXT,
    scoala VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);

-- ═══════════════════════════════════════════════════════════
-- CLASE TABLE - Clase create de profesori
-- ═══════════════════════════════════════════════════════════
CREATE TABLE clase (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profesor_id INT NOT NULL,
    nume VARCHAR(100) NOT NULL,
    cod_invitatie VARCHAR(20) UNIQUE NOT NULL,
    descriere TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (profesor_id) REFERENCES profesori(id) ON DELETE CASCADE,
    INDEX idx_profesor_id (profesor_id),
    INDEX idx_cod_invitatie (cod_invitatie)
);

-- ═══════════════════════════════════════════════════════════
-- INSCRISURI TABLE - Relația elevi-clase
-- ═══════════════════════════════════════════════════════════
CREATE TABLE inscrisuri (
    id INT AUTO_INCREMENT PRIMARY KEY,
    elev_id INT NOT NULL,
    clasa_id INT NOT NULL,
    data_inscriere TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progres_procent INT DEFAULT 0,
    UNIQUE KEY unique_elev_clasa (elev_id, clasa_id),
    FOREIGN KEY (elev_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (clasa_id) REFERENCES clase(id) ON DELETE CASCADE,
    INDEX idx_elev_id (elev_id),
    INDEX idx_clasa_id (clasa_id)
);

-- ═══════════════════════════════════════════════════════════
-- TESTE TABLE - Teste create de profesori pentru clase
-- ═══════════════════════════════════════════════════════════
CREATE TABLE teste (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clasa_id INT NOT NULL,
    profesor_id INT NOT NULL,
    titlu VARCHAR(255) NOT NULL,
    descriere TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (clasa_id) REFERENCES clase(id) ON DELETE CASCADE,
    FOREIGN KEY (profesor_id) REFERENCES profesori(id) ON DELETE CASCADE,
    INDEX idx_clasa_id (clasa_id),
    INDEX idx_profesor_id (profesor_id)
);

-- ═══════════════════════════════════════════════════════════
-- INTREBARI TABLE - Întrebări în teste
-- ═══════════════════════════════════════════════════════════
CREATE TABLE intrebari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    test_id INT NOT NULL,
    tip ENUM('choice', 'short_answer', 'essay') NOT NULL,
    text_intrebare TEXT NOT NULL,
    puncte INT DEFAULT 1,
    FOREIGN KEY (test_id) REFERENCES teste(id) ON DELETE CASCADE,
    INDEX idx_test_id (test_id)
);

-- ═══════════════════════════════════════════════════════════
-- OPTIUNI_RASPUNS TABLE - Opțiuni pentru întrebări cu variante
-- ═══════════════════════════════════════════════════════════
CREATE TABLE optiuni_raspuns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    intrebare_id INT NOT NULL,
    text_optiune VARCHAR(255) NOT NULL,
    este_corecta BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (intrebare_id) REFERENCES intrebari(id) ON DELETE CASCADE,
    INDEX idx_intrebare_id (intrebare_id)
);

-- ═══════════════════════════════════════════════════════════
-- REZULTATE TABLE - Scoruri și progres elevi
-- ═══════════════════════════════════════════════════════════
CREATE TABLE rezultate (
    id INT AUTO_INCREMENT PRIMARY KEY,
    elev_id INT NOT NULL,
    test_id INT NOT NULL,
    puncte_obtinute INT DEFAULT 0,
    puncte_totale INT,
    procent_corect DECIMAL(5, 2),
    data_completare TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (elev_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (test_id) REFERENCES teste(id) ON DELETE CASCADE,
    INDEX idx_elev_id (elev_id),
    INDEX idx_test_id (test_id),
    INDEX idx_data (data_completare)
);

-- ═══════════════════════════════════════════════════════════
-- RASPUNSURI_ELEV TABLE - Răspunsurile fiecărui elev
-- ═══════════════════════════════════════════════════════════
CREATE TABLE raspunsuri_elev (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rezultat_id INT NOT NULL,
    intrebare_id INT NOT NULL,
    raspuns_text TEXT,
    optiune_id INT,
    este_corect BOOLEAN,
    FOREIGN KEY (rezultat_id) REFERENCES rezultate(id) ON DELETE CASCADE,
    FOREIGN KEY (intrebare_id) REFERENCES intrebari(id) ON DELETE CASCADE,
    FOREIGN KEY (optiune_id) REFERENCES optiuni_raspuns(id) ON DELETE SET NULL,
    INDEX idx_rezultat_id (rezultat_id)
);

-- ═══════════════════════════════════════════════════════════
-- SESSIUNI TABLE - Management sesiuni/tokens
-- ═══════════════════════════════════════════════════════════
CREATE TABLE sessiuni (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id)
);

-- ═══════════════════════════════════════════════════════════
-- INDEX pentru performanță
-- ═══════════════════════════════════════════════════════════
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_clase_profesor ON clase(profesor_id);
CREATE INDEX idx_inscrisuri_elev ON inscrisuri(elev_id);
CREATE INDEX idx_teste_clasa ON teste(clasa_id);
CREATE INDEX idx_rezultate_elev_test ON rezultate(elev_id, test_id);
