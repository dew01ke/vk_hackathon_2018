<?php

header('Access-Control-Allow-Origin: *');

include 'Lib.php';


$pdo = getDB();

$route = filter_input(INPUT_GET, 'route');



switch ($route) {
case null:
case '':
  showMain();
  break;

}

function showMain()
{
  global $pdo;
  $posters = getPosters($pdo);

  header('Content-type: application/json; charset=utf-8');

  foreach ($posters as $poster) {
    if($poster->composer_id) {
      $poster->composer = getComposer($pdo, $poster->composer_id);
      $poster->composer->concerts = getConcerts($poster->composer);
      $poster->composer->best = getTracks($poster->composer);
    } else {
      $poster->composer = null;
    }
  }
  
  echo json_encode($posters, JSON_UNESCAPED_UNICODE);
}


