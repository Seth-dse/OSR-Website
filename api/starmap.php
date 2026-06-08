<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

$starmapFile = '../data/starmap.json';

if (file_exists($starmapFile)) {
    echo file_get_contents($starmapFile);
} else {
    http_response_code(404);
    echo json_encode(["error" => "Starmap registry not found"]);
}
?>
