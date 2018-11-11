<?php
function getComposers($pdo)
{
  $c = [];
  $stmt = $pdo->query("SELECT id, first_name, last_name, image, years, about_short, about_full, bio_short, bio_full FROM composer ORDER BY id DESC");
  while(($row = $stmt->fetch()))
    $c[] = $row;
  return $c;
}

function getComposer($pdo, $id)
{
  $stmt = $pdo->query("SELECT id, first_name, last_name, image, years, about_short, about_full, bio_short, bio_full FROM composer WHERE id = " . (int)$id);
  return $stmt->fetch();
}

function createComposer($pdo, $data)
{
  $stmt = $pdo->prepare("INSERT INTO composer SET first_name = :first_name, last_name = :last_name, image = :image, years = :years, about_short = :about_short, about_full = :about_full, bio_short = :bio_short, bio_full = :bio_full");
  $stmt->execute($data);
}

function updateComposer($pdo, $composer)
{
  $stmt = $pdo->prepare("UPDATE composer SET first_name = :first_name, last_name = :last_name, image = :image, years = :years, about_short = :about_short, about_full = :about_full, bio_short = :bio_short, bio_full = :bio_full WHERE id = " . (int)$composer->id);
  $stmt->execute(['first_name' => $composer->first_name, 'last_name' => $composer->last_name, 'image' => $composer->image, 'years' => $composer->years, 'about_short' => $composer->about_short, 'about_full' => $composer->about_full, 'bio_short' => $composer->bio_short, 'bio_full' => $composer->bio_full]);
}

function removeComposer($pdo, $id)
{
  $stmt = $pdo->query("DELETE FROM composer WHERE id = " . (int)$id);
}
