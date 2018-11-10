<?php
function getPosters($pdo)
{
  $c = [];
  $stmt = $pdo->query("SELECT id, image, url, description, composer_id FROM poster ORDER BY id DESC");
  while ($row = $stmt->fetch())
    $c[] = $row;
  return $c;
}

function getPoster($pdo, $id)
{
  $stmt = $pdo->query("SELECT id, image, url, description, composer_id FROM poster WHERE id = " . (int)$id);
  return $stmt->fetch();
}

function createPoster($pdo, $data)
{
  $data['composer_id'] = $data['composer_id'] ?: null;
  $stmt = $pdo->prepare("INSERT INTO poster SET image = :image, url = :url, description = :description, composer_id = :composer_id");
  $stmt->execute($data);
}

function updatePoster($pdo, $poster)
{
  $stmt = $pdo->prepare("UPDATE poster SET url=:url, description=:description, composer_id = :composer_id WHERE id = " . (int)$poster->id);
  $stmt->execute(['description' => $poster->description, 'url' => $poster->url, 'composer_id' => $poster->composer_id]);
}

function removePoster($pdo, $id)
{
  $stmt = $pdo->query("DELETE FROM poster WHERE id = " . (int)$id);
}
