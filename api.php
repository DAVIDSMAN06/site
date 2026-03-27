<?php
// ═══════════════════════════════════════════════════════════
// FixMind - Authentication API (PHP)
// Login, Register, JWT (fără dependențe externe)
// ═══════════════════════════════════════════════════════════

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Database configuration
$db_host = 'localhost';
$db_user = 'root';
$db_pass = '';
$db_name = 'fixmind';

// Connect to database
$conn = mysqli_connect($db_host, $db_user, $db_pass, $db_name);

if (!$conn) {
    http_response_code(500);
    echo json_encode(['error' => 'Conexiune database eșuată: ' . mysqli_connect_error()]);
    exit;
}

mysqli_set_charset($conn, 'utf8');

// ═══════════════════════════════════════════════════════════
// JWT Functions (Simple)
// ═══════════════════════════════════════════════════════════

$JWT_SECRET = 'your-super-secret-key-change-this';

function createJWT($id, $email, $type) {
    global $JWT_SECRET;
    $header = json_encode(['alg' => 'HS256', 'typ' => 'JWT']);
    $payload = json_encode([
        'id' => $id,
        'email' => $email,
        'type' => $type,
        'iat' => time(),
        'exp' => time() + (7 * 24 * 60 * 60) // 7 days
    ]);
    
    $header_encoded = rtrim(strtr(base64_encode($header), '+/', '-_'), '=');
    $payload_encoded = rtrim(strtr(base64_encode($payload), '+/', '-_'), '=');
    $signature = hash_hmac('sha256', "$header_encoded.$payload_encoded", $JWT_SECRET, true);
    $signature_encoded = rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');
    
    return "$header_encoded.$payload_encoded.$signature_encoded";
}

function verifyJWT($token) {
    global $JWT_SECRET;
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    
    $header_encoded = $parts[0];
    $payload_encoded = $parts[1];
    $signature_encoded = $parts[2];
    
    // Verify signature
    $signature = hash_hmac('sha256', "$header_encoded.$payload_encoded", $JWT_SECRET, true);
    $signature_check = rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');
    
    if ($signature_check !== $signature_encoded) return null;
    
    // Decode payload
    $payload_json = base64_decode(strtr($payload_encoded, '-_', '+/'));
    $payload = json_decode($payload_json, true);
    
    // Check expiration
    if ($payload['exp'] < time()) return null;
    
    return $payload;
}

function getToken() {
    $headers = getallheaders();
    if (isset($headers['Authorization'])) {
        $auth = $headers['Authorization'];
        if (strpos($auth, 'Bearer ') === 0) {
            return substr($auth, 7);
        }
    }
    return null;
}

// ═══════════════════════════════════════════════════════════
// REGISTER
// ═══════════════════════════════════════════════════════════

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_GET['action'] === 'register') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';
    $first_name = $data['first_name'] ?? '';
    $last_name = $data['last_name'] ?? '';
    $type = $data['type'] ?? '';
    $materia = $data['materia'] ?? 'Psihologie';
    
    // Validate
    if (!$email || !$password || !$first_name || !$last_name || !$type) {
        http_response_code(400);
        echo json_encode(['error' => 'Toate câmpurile sunt obligatorii']);
        exit;
    }
    
    if (strlen($password) < 6) {
        http_response_code(400);
        echo json_encode(['error' => 'Parola trebuie să aibă minim 6 caractere']);
        exit;
    }
    
    if (!in_array($type, ['profesor', 'elev'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Tip invalid']);
        exit;
    }
    
    // Check if email exists
    $result = mysqli_query($conn, "SELECT id FROM users WHERE email = '" . mysqli_real_escape_string($conn, $email) . "'");
    if (mysqli_num_rows($result) > 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Email-ul este deja înregistrat']);
        exit;
    }
    
    // Hash password
    $password_hash = password_hash($password, PASSWORD_BCRYPT);
    
    // Insert user
    $query = "INSERT INTO users (email, password_hash, first_name, last_name, type, oauth_provider) 
              VALUES ('" . mysqli_real_escape_string($conn, $email) . "', 
                      '" . mysqli_real_escape_string($conn, $password_hash) . "', 
                      '" . mysqli_real_escape_string($conn, $first_name) . "', 
                      '" . mysqli_real_escape_string($conn, $last_name) . "', 
                      '" . mysqli_real_escape_string($conn, $type) . "', 
                      'local')";
    
    if (!mysqli_query($conn, $query)) {
        http_response_code(500);
        echo json_encode(['error' => 'Eroare la înregistrare: ' . mysqli_error($conn)]);
        exit;
    }
    
    $user_id = mysqli_insert_id($conn);
    
    // If profesor, create profesor record
    if ($type === 'profesor') {
        $prof_query = "INSERT INTO profesori (user_id, materia) VALUES ($user_id, '" . mysqli_real_escape_string($conn, $materia) . "')";
        mysqli_query($conn, $prof_query);
    }
    
    // Generate JWT
    $token = createJWT($user_id, $email, $type);
    
    http_response_code(201);
    echo json_encode([
        'message' => 'Cont creat cu succes',
        'token' => $token,
        'user' => [
            'id' => $user_id,
            'email' => $email,
            'first_name' => $first_name,
            'last_name' => $last_name,
            'type' => $type
        ]
    ]);
    exit;
}

// ═══════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_GET['action'] === 'login') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';
    
    if (!$email || !$password) {
        http_response_code(400);
        echo json_encode(['error' => 'Email și parolă sunt obligatorii']);
        exit;
    }
    
    $result = mysqli_query($conn, "SELECT id, email, password_hash, first_name, last_name, type FROM users WHERE email = '" . mysqli_real_escape_string($conn, $email) . "' AND oauth_provider = 'local'");
    
    if (mysqli_num_rows($result) === 0) {
        http_response_code(401);
        echo json_encode(['error' => 'Email sau parolă incorectă']);
        exit;
    }
    
    $user = mysqli_fetch_assoc($result);
    
    if (!password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Email sau parolă incorectă']);
        exit;
    }
    
    $token = createJWT($user['id'], $user['email'], $user['type']);
    
    echo json_encode([
        'message' => 'Login reușit',
        'token' => $token,
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'first_name' => $user['first_name'],
            'last_name' => $user['last_name'],
            'type' => $user['type']
        ]
    ]);
    exit;
}

// ═══════════════════════════════════════════════════════════
// CREATE CLASS (Professor)
// ═══════════════════════════════════════════════════════════

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_GET['action'] === 'create_class') {
    $token = getToken();
    $user = verifyJWT($token);
    
    if (!$user || $user['type'] !== 'profesor') {
        http_response_code(403);
        echo json_encode(['error' => 'Doar profesori pot crea clase']);
        exit;
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    $nume = $data['nume'] ?? '';
    $descriere = $data['descriere'] ?? '';
    
    if (!$nume) {
        http_response_code(400);
        echo json_encode(['error' => 'Nume clasă obligatoriu']);
        exit;
    }
    
    // Get profesor id
    $prof_result = mysqli_query($conn, "SELECT id FROM profesori WHERE user_id = " . $user['id']);
    if (mysqli_num_rows($prof_result) === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Profil profesor nu găsit']);
        exit;
    }
    
    $profesor = mysqli_fetch_assoc($prof_result);
    $profesor_id = $profesor['id'];
    
    // Generate unique code
    $cod_invitatie = strtoupper(substr(md5(time() . rand()), 0, 6));
    
    $query = "INSERT INTO clase (profesor_id, nume, cod_invitatie, descriere) 
              VALUES ($profesor_id, 
                      '" . mysqli_real_escape_string($conn, $nume) . "', 
                      '" . $cod_invitatie . "', 
                      '" . mysqli_real_escape_string($conn, $descriere) . "')";
    
    if (!mysqli_query($conn, $query)) {
        http_response_code(500);
        echo json_encode(['error' => 'Eroare la crearea clasei']);
        exit;
    }
    
    $clasa_id = mysqli_insert_id($conn);
    
    http_response_code(201);
    echo json_encode([
        'message' => 'Clasă creată cu succes',
        'clasa' => [
            'id' => $clasa_id,
            'nume' => $nume,
            'cod_invitatie' => $cod_invitatie,
            'descriere' => $descriere
        ]
    ]);
    exit;
}

// ═══════════════════════════════════════════════════════════
// GET PROFESSOR CLASSES
// ═══════════════════════════════════════════════════════════

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $_GET['action'] === 'get_classes') {
    $token = getToken();
    $user = verifyJWT($token);
    
    if (!$user || $user['type'] !== 'profesor') {
        http_response_code(403);
        echo json_encode(['error' => 'Doar profesori pot accesa aceasta']);
        exit;
    }
    
    // Get profesor id
    $prof_result = mysqli_query($conn, "SELECT id FROM profesori WHERE user_id = " . $user['id']);
    if (mysqli_num_rows($prof_result) === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Profil profesor nu găsit']);
        exit;
    }
    
    $profesor = mysqli_fetch_assoc($prof_result);
    
    $query = "SELECT c.id, c.nume, c.cod_invitatie, c.descriere, c.created_at,
                     COUNT(i.id) as numar_elevi
              FROM clase c
              LEFT JOIN inscrisuri i ON c.id = i.clasa_id
              WHERE c.profesor_id = " . $profesor['id'] . "
              GROUP BY c.id
              ORDER BY c.created_at DESC";
    
    $result = mysqli_query($conn, $query);
    $clase = [];
    
    while ($row = mysqli_fetch_assoc($result)) {
        $clase[] = $row;
    }
    
    echo json_encode(['clase' => $clase]);
    exit;
}

// ═══════════════════════════════════════════════════════════
// JOIN CLASS (Student)
// ═══════════════════════════════════════════════════════════

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_GET['action'] === 'join_class') {
    $token = getToken();
    $user = verifyJWT($token);
    
    if (!$user || $user['type'] !== 'elev') {
        http_response_code(403);
        echo json_encode(['error' => 'Doar elevi pot se alatura unei clase']);
        exit;
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    $cod_invitatie = strtoupper($data['cod_invitatie'] ?? '');
    
    if (!$cod_invitatie) {
        http_response_code(400);
        echo json_encode(['error' => 'Cod invitatie obligatoriu']);
        exit;
    }
    
    // Find class
    $class_result = mysqli_query($conn, "SELECT id FROM clase WHERE cod_invitatie = '" . mysqli_real_escape_string($conn, $cod_invitatie) . "'");
    
    if (mysqli_num_rows($class_result) === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Cod invitatie invalid']);
        exit;
    }
    
    $clase = mysqli_fetch_assoc($class_result);
    $clasa_id = $clase['id'];
    
    // Check if student already in a class
    $existing = mysqli_query($conn, "SELECT id FROM inscrisuri WHERE elev_id = " . $user['id']);
    if (mysqli_num_rows($existing) > 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Ești deja înscris într-o clasă']);
        exit;
    }
    
    // Add student to class
    $insert = "INSERT INTO inscrisuri (elev_id, clasa_id) VALUES (" . $user['id'] . ", $clasa_id)";
    
    if (!mysqli_query($conn, $insert)) {
        http_response_code(500);
        echo json_encode(['error' => 'Eroare la alăturare clasei']);
        exit;
    }
    
    echo json_encode(['message' => 'Te-ai alăturat clasei cu succes']);
    exit;
}

// ═══════════════════════════════════════════════════════════
// DEFAULT
// ═══════════════════════════════════════════════════════════

http_response_code(404);
echo json_encode(['error' => 'Endpoint not found']);
?>
