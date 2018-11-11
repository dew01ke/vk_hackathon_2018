<?php

function display($body, $header = '')
{

  
  include 'templates/page.php';
}

include 'Poster.php';
include 'Composer.php';
include 'Concert.php';

function getDB()
{
  $dsn = "mysql:host=proxy.andrey-volkov.ru;dbname=hack18;charset=utf8";
  $user = "hack18";
  $password = "hack18";
  $opt = [PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_OBJ];

  $dbh = new PDO($dsn, $user, $password, $opt);

  return $dbh;
}



function _1getFragments($pdo)
{
  $c = [];
  $stmt = $pdo->query("SELECT id, sex, age, range, track_id, url FROM fragment ORDER BY id DESC");
  while ($row = $stmt->fetch())
    $c[] = $row;
  return $c;
}

function _1getFragment($pdo, $id)
{
  $stmt = $pdo->query("SELECT id, sex, age, range, track_id, url FROM fragment WHERE id = " . (int)$id);
  return $stmt->fetch();
}

function createFragment($pdo, $data)
{
  $stmt = $pdo->prepare("INSERT INTO fragment SET sex = :sex, age = :age, range = :range, track_id = :track_id, url = :url");
  $stmt->execute($data);
}

function _1updateFragment($pdo, $fragment)
{
  $stmt = $pdo->prepare("UPDATE fragment SET sex = :sex, age = :age, range = :range, track_id = :track_id, url = :url WHERE id = " . (int)$fragment->id);
  $stmt->execute(['sex' => $fragment->sex, 'age' => $fragment->age, 'range' => $fragment->range, 'track_id' => $fragment->track_id, 'url' => $fragment->url]);
}

function _1removeFragment($pdo, $id)
{
  $stmt = $pdo->query("DELETE FROM fragment WHERE id = " . (int)$id);
}








function getTracks($composer = null)
{
  $tracks = [
	    (object)[
		     'id' => '1',
		     'title' => 'MechetinaplaysRachmaninov',
		     'url' => '/assets/MechetinaplaysRachmaninov.mp3',
		     'age' => 0,
		     'sex' => 0,
		     'composer_id' => 3,
		     'fragments' => [
				     (object)[
					      'id' => 1,
					      'sex' => 'male',
					      'age' => 'Дети',
					      'range' => '12:45-24:14',
					      'track_id' => 1,
					      'url' => '/assets/MechetinaplaysRachmaninov-fragment-1.mp3',

					      ],
				     (object)[
					      'id' => 2,
					      'sex' => 'female',
					      'age' => '',
					      'range' => '00:00-10:14',
					      'track_id' => 1,		     'url' => '/assets/MechetinaplaysRachmaninov-fragment-2.mp3',

					      ],
				     (object)[
					      'id' => 3,
					      'sex' => '',
					      'age' => 'Подростки',
					      'range' => '00:00-10:14',
					      'track_id' => 1,		     'url' => '/assets/MechetinaplaysRachmaninov-fragment-3.mp3',

					      ],
]
		     ],
	    (object)[
		     'id' => '2',
		     'title' => 'RachDayssmall',
		     'url' => '/assets/RachDayssmall.mp3',
		     'age' => 0,
		     'sex' => 0,
		     'composer_id' => 3,
		     'fragments' => [],
		     ],
	    (object)[
		     'id' => '3',
		     'title' => 'Rachmaninov-Vocalise',
		     'url' => '/assets/Rachmaninov-Vocalise.mp3',
		     'age' => 0,
		     'sex' => 0,
		     'composer_id' => 3,
		     'fragments' => [],
		     ],
	    (object)[
		     'id' => '4',
		     'title' => 'PromoTchaikovskyMatsuevGergiev',
		     'url' => '/assets/PromoTchaikovskyMatsuevGergiev.mp3',
		     'age' => 0,
		     'sex' => 0,
		     'composer_id' => 2,
		     'fragments' => [],
		     ],
	    (object)[
		     'id' => '5',
		     'title' => 'Tchaikovsky_Lebedinoe',
		     'url' => '/assets/Tchaikovsky_Lebedinoe.mp3',
		     'age' => 0,
		     'sex' => 0,
		     'composer_id' => 2,
		     'fragments' => [],
		     ],
	     
	     ];

  if (!$composer) {
    return $tracks;
  } elseif ($composer->last_name == 'Рахманинов') {
    return [
	    $tracks[0],$tracks[1],$tracks[2]
	    ];
    
  } elseif ($composer->last_name == 'Чайковский') {
    return [
	    $tracks[3],$tracks[4]
	    ];
  } else {
    return [];
  }


}

function getTrack($id)
{
  $tracks = getTracks();


  foreach ($tracks as $track)
    if ($track->id == $id) {

      return $track;
    }
}


function getFragment($id)
{
  $tracks = getTracks();

  foreach ($tracks as $track) {
    foreach ($track->fragments as $fragment)
      if ($fragment->id == $id)
	return $fragment;
  }
}


