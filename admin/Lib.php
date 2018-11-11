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


function getTracks($composer = null)
{
  $tracks = [
	    (object)[
		     'id' => '1',
		     'title' => 'MechetinaplaysRachmaninov',
		     'url' => '/audio/MechetinaplaysRachmaninov.mp3',
		     'age' => 0,
		     'sex' => 0,
		     'composer_id' => 3,
		     'fragments' => [
				     (object)[
					      'id' => 1,
					      'sex' => 'male',
					      'age' => '0-5',
					      'range' => '12:45-24:14',
					      'track_id' => 1,
					      'url' => '/audio/MechetinaplaysRachmaninov-1.mp3',

					      ],
				     (object)[
					      'id' => 2,
					      'sex' => 'female',
					      'age' => '',
					      'range' => '00:00-10:14',
					      'track_id' => 1,		     'url' => '/audio/MechetinaplaysRachmaninov-2.mp3',

					      ],
				     (object)[
					      'id' => 3,
					      'sex' => '',
					      'age' => '5-20',
					      'range' => '00:00-10:14',
					      'track_id' => 1,		     'url' => '/audio/MechetinaplaysRachmaninov-3.mp3',

					      ],
]
		     ],
	    (object)[
		     'id' => '2',
		     'title' => 'RachDayssmall',
		     'url' => '/audio/RachDayssmall.mp3',
		     'age' => 0,
		     'sex' => 0,
		     'composer_id' => 3,
		     ],
	    (object)[
		     'id' => '3',
		     'title' => 'Rachmaninov-Vocalise',
		     'url' => '/audio/Rachmaninov-Vocalise.mp3',
		     'age' => 0,
		     'sex' => 0,
		     'composer_id' => 3,
		     ],
	    (object)[
		     'id' => '4',
		     'title' => 'PromoTchaikovskyMatsuevGergiev',
		     'url' => '/audio/PromoTchaikovskyMatsuevGergiev.mp3',
		     'age' => 0,
		     'sex' => 0,
		     'composer_id' => 2,
		     ],
	    (object)[
		     'id' => '5',
		     'title' => 'Tchaikovsky_Lebedinoe',
		     'url' => '/audio/Tchaikovsky_Lebedinoe.mp3',
		     'age' => 0,
		     'sex' => 0,
		     'composer_id' => 2,
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


