<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

$intelFile = '../data/intel.json';

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// GET: Fetch all intel reports
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($intelFile)) {
        echo file_get_contents($intelFile);
    } else {
        echo json_encode([]);
    }
    exit;
}

// POST: Save a new intel report
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents("php://input");
    $newReport = json_decode($input, true);

    if (!$newReport) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid JSON input"]);
        exit;
    }

    $intel = [];
    if (file_exists($intelFile)) {
        $data = file_get_contents($intelFile);
        $intel = json_decode($data, true) ?? [];
    }

    // Add new report to the top (newest first)
    array_unshift($intel, $newReport);

    if (file_put_contents($intelFile, json_encode($intel, JSON_PRETTY_PRINT))) {
        echo json_encode(["message" => "Intelligence logged successfully", "report" => $newReport]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Failed to write to intel file. Check permissions."]);
    }
    exit;
}
?>
