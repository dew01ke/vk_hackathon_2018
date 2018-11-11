<?php

include 'Lib.php';

$pdo = getDB();

$route = filter_input(INPUT_GET, 'route');

switch ($route) {
case NULL:
case '':
  showMain();
  break;



case 'posters':
  showPosters();
  break;

case 'poster':
  if ($_SERVER['REQUEST_METHOD'] == 'POST')
    _editPoster();
  else
    editPoster();
  break;

case 'poster_add':
  if ($_SERVER['REQUEST_METHOD'] == 'POST')
    _addPoster();
  else
    addPoster();
  break;

case 'poster_remove':
  _removePoster();
  break;



case 'composers':
  showComposers();
  break;

case 'composer':
  if ($_SERVER['REQUEST_METHOD'] == 'POST')
    _editComposer();
  else
    editComposer();
  break;

case 'composer_add':
  if ($_SERVER['REQUEST_METHOD'] == 'POST')
    _addComposer();
  else
    addComposer();
  break;

case 'composer_remove':
  _removeComposer();
  break;



case 'tracks':
  showTracks();
  break;


case 'track':
  showTrack();
  break;

case 'track_edit':
  if ($_SERVER['REQUEST_METHOD'] == 'POST')
    _editTrack();
  else
    editTrack();
  break;

case 'track_add':
  if ($_SERVER['REQUEST_METHOD'] == 'POST')
    _addTrack();
  else
    addTrack();
  break;

case 'track_remove':
  header('Location: /admin.php?route=tracks');
  break;


  



case 'fragment_add':
  if ($_SERVER['REQUEST_METHOD'] == 'POST')
    _addFragment();
  else
    addFragment();
  break;

case 'fragment_remove':
  removeFragment();
  break;


case 'fragment_edit':
  if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    $fragment = getFragment($id);
    $track_id = $fragment->track_id;
    
    header('Location: /admin.php?route=track&id=' . $track_id);

    //_editFragment();
  } else {
    editFragment();
  }
  break;

case 'fragment_remove':
  break;


  
  
}

function removeFragment()
{
  $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
  $fragment = getFragment($id);
  $track_id = $fragment->track_id;
  
  header('Location: /admin.php?route=track&id=' . $track_id);
  
}


function addFragment()
{
  
  $track = getTrack($_GET['track_id']);

  ob_start();
  echo '<form action="?route=fragment_add&track_id=' . $track->id . '" method="POST">
    <div class="form-group">
       <label for="_text">Длительность</label>
       <input class="form-control" id="_text" type="text" name="range"    value=""/>
    </div>
    <div class="form-group">';
  echo '<label for="_age">Возрастная категория</label> <select class="custom-select form-control" id="_age" name="age">
<option value=""></option>
<option value="Дети">Дети</option>
<option value="Подростки">Подростки</option>
</select>
    </div>
    <div class="form-group">';
  echo '<label for="_gender">Пол</label> <select class="custom-select form-control" id="_gender" name="sex">
<option value=""></option>
<option value="male">мужской</option>
<option value="female">женский</option>
</select>
    </div>';
  echo '<input  class="btn btn-primary" type="submit" value="Сохранить"/>';
  echo '</form>';

  $body = ob_get_contents();
  ob_end_clean();
  display($body, 'Новый фрагмент аудиозаписи &laquo;' . $track->title . '&raquo;');
  
}

function _addFragment()
{
  global $pdo;

  $data = $_POST;
  $data['track_id'] = $_GET['track_id'];
  //ffmpeg
  createFragment($pdo, $_POST);
  header('Location: /admin.php?route=track&id='  . $_GET['track_id']);
}

function editFragment()
{
  $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
  $fragment = getFragment($id);
  $track = getTrack($fragment->track_id);
  
  ob_start();
  
  echo '<form action="?route=fragment_edit&id=' . $fragment->id . '" method="POST">';

  echo '<div class="form-group">
           <label for="_range">Время</label> <input id="_range" class="form-control"  type="text" name="range"    value="' . $fragment->range . '"/>
     </div>';
  echo '<div class="form-group">
       <label for="_age">Возрастная категория</label>
             <select class="custom-select form-control" id="_age" name="age">
<option value=""></option>
<option value="Дети"'  .
    ($fragment->age == 'Дети' ? ' selected' : '')
    . '>Дети</option>
<option value="Подростки"'  .
    ($fragment->age == 'Подростки' ? ' selected' : '')
    . '>Подростки</option>
</select></div>';
  echo '<div class="form-group"><label for="_gender">Пол</label> <select class="custom-select form-control" id="_gender" name="sex">
<option value=""></option>
<option value="male"'  .
    ($fragment->sex == 'male' ? ' selected' : '')
    . '>мужской</option>
<option value="female"'  .
    ($fragment->sex == 'female' ? ' selected' : '')
    . '>женский</option>
</select></div>';
  echo '<input class="btn btn-primary" type="submit" value="Сохранить"/>';
  echo '</form>';
  $body = ob_get_contents();
  ob_end_clean();
  display($body, 'Редактирование фрагмента аудиозаписи &laquo;' . $track->title . '&raquo;');
  
}

function _eidtFragment()
{
  global $pdo;
  
  //createFragment($pdo, $_POST);
  header('Location: /admin.php?route=track?id=' . $fragment->track_id);
}



function showTracks()
{
  ob_start();
  $tracks = getTracks();
  echo '<table class="table">';
  echo '<tr><th>Аудиозапись</th><th></th></tr>';
  foreach ($tracks as $track) {
    echo '<tr><td><a href="?route=track&id=' . $track->id . '">' . $track->title . '</a></td><td><a href="?route=track_remove&id=' . $track->id . '">Удалить</a></td></tr>';
  }
  echo '</table>';
  $body = ob_get_contents();
  ob_end_clean();
  display($body, 'Аудиозаписи <a class="btn btn-outline-primary" href="?route=track_add">Новая аудиозапись</a>');
}

function showTrack()
{
  ob_start();
  $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
  $track = getTrack($id);
  
  echo 'Файл: <a href="' . $track->url . '">' . $track->url . '</a> ';

  echo '<a href="?route=track_edit&id=' . $track->id . '">Редактировать</a></br>';

  echo '<a  class="btn btn-primary" href="?route=fragment_add&track_id=' . $track->id . '">Добавить фрагмент</a>';

  if ($track->fragments) {
    echo '<table class="table">';
    echo '<tr><th>Файл</th><th>Время</th><th>Пол</th><th>Возраст</th><th></th></tr>';
    foreach ($track->fragments as $frag) {
      echo '<tr><td><a href="' . $frag->url . '">' . $frag->url . '</a></td><td>' . $frag->range . '</td><td>' . $frag->sex . '</td><td>' . $frag->age . '</td><td><a href="?route=fragment_edit&id=' . $frag->id . '">Править</a>
<a href="?route=fragment_remove&id=' . $frag->id . '">Удалить</a></td></tr>';
    }
    echo '</table>';
  }
  
  $body = ob_get_contents();
  ob_end_clean();
  display($body, "Аудиозапись &laquo;" . $track->title . '&raquo;');
}


function editTrack()
{
  ob_start();
  global $pdo;
  
  $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
  $track = getTrack($id);
  $composers = getComposers($pdo);
  
  echo '<form action="?route=track_edit&id=' . $track->id . '" method="POST">';
  echo '<div class="form-group"><label for="_url">URL</label><input class="form-control" id="_url" name="url" type="text" value="' . $track->url . '"/></div>';
  echo '<div class="form-group"><label for="_name">Название</label><input id="_name" class="form-control" name="title" type="text" value="' . $track->title . '"/>';
  echo '<div class="form-group"><label for="_composer">Композитор</label> <select id="_composer" class="custom-select form-control" name="composer_id">';
  echo '<option value=""></option>';
  foreach ($composers as $composer) {
    echo '<option value="' . $composer->id . '"';
    if ($composer->id == $track->composer_id)
      echo ' selected="selected"';
    echo '>' . $composer->first_name . ' ' . $composer->last_name . '</option>';
  }
  
  echo '</select></div>';
  echo '<input class="btn btn-primary" type="submit" value="Сохранить"/>';
  echo '</form>';
  
  $body = ob_get_contents();
  ob_end_clean();
  display($body, "Редактировать аудиозапись &laquo;" . $track->title . '&raquo;');
}

function _editTrack()
{
  global $pdo;
  
  $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
  $track = getTrack($id);

//  $poster->url = $_POST['url'];
//  $poster->description = $_POST['description'];
//  $poster->composer_id = $_POST['composer_id'] ?: null;

//  $poster = updatePoster($pdo, $poster);
  header('Location: /admin.php?route=track&id=' . $track->id);
}

function addTrack()
{
  global $pdo;
  $composers = getComposers($pdo);

  ob_start();


  echo '<form action="?route=track_add" method="POST">';
  echo '<div class="form-group"><label for="_url">URL</label><input id="_url" name="url" class="form-control" type="text"/></div>';
  echo '<div class="form-group"><label for="_name">Название</label><input id="_name" name="title" class="form-control" type="text" value=""/>';
  echo '<div class="form-group"><label for="_composer">Композитор</label> <select id="_composer" class="custom-select form-control" name="composer_id">';
  echo '<option value=""></option>';
  foreach ($composers as $composer) {
    echo '<option value="' . $composer->id . '"';
    echo '>' . $composer->first_name . ' ' . $composer->last_name . '</option>';
  }
  
  echo '</select></div>';
  echo '<input class="btn btn-primary" type="submit" value="Сохранить"/>';
  echo '</form>';


  $body = ob_get_contents();
  ob_end_clean();
  display($body,"Новая аудиозапись");
  
}

function _addTrack()
{
  global $pdo;
  
  //  createPoster($pdo, $_POST);
  header('Location: /admin.php?route=tracks');
}



function showMain()
{
  ob_start();
  echo '<a href="?route=composers">Композиторы</a></br>';
  echo '<a href="?route=posters">Афиши</a></br>';
  echo '<a href="?route=tracks">Аудиозаписи</a>';
  $body = ob_get_contents();
  ob_end_clean();
  display($body, 'Управление сайтом');
}


function showComposers()
{
  ob_start();
  global $pdo;
  
  $composers = getComposers($pdo);


  echo '<table class="table">';
  echo '<tr><th>Композитор</th><th></th></tr>';
  foreach ($composers as $composer) {
    echo '<tr><td><a href="?route=composer&id=' . $composer->id . '">' . $composer->first_name . ' ' . $composer->last_name . '</a></td><td><a href="?route=composer_remove&id=' . $composer->id . '">Удалить</a></td></tr>';
  }
  echo '</table>';
  $body = ob_get_contents();
  ob_end_clean();
  display($body, 'Композиторы <a  class="btn btn-outline-primary" href="?route=composer_add">Новая страница композитора</a>');
}



function editComposer()
{
  ob_start();
  global $pdo;
  
  $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
  $composer = getComposer($pdo, $id);

  echo '<form action="?route=composer&id=' . $composer->id . '" method="POST">';

  echo '<div class="form-group"><label for="_name">Имя</label> <input id="_name" type="text" name="first_name" class="form-control" value="' . $composer->first_name . '"/></div>';
  echo '<div class="form-group"><label for="_last">Фамилия</label> <input type="text" name="last_name" class="form-control" value="' . $composer->last_name . '"/></div>';
  echo '<div class="form-group"><label for="_img">Изображение</label><input type="text" id="_img" name="image" class="form-control" value="' . $composer->image . '"/></div>';
  echo '<div class="form-group"><label for="_years">Годы жизни</label><input type="text" id="_years" name="years" class="form-control" value="' . $composer->years . '"/></div>';
  echo '<div class="form-group"><label for="_as">Краткое описание</label> <textarea name="about_short" id="_as" class="form-control" >' . htmlspecialchars($composer->about_short) . '</textarea></div>';
  echo '<div class="form-group"><label for="_af">Подробное описание</label><textarea name="about_full" id="_af" class="form-control" >' . htmlspecialchars($composer->about_full) . '</textarea></div>';
  echo '<div class="form-group"><label for="_bs">Краткая биография</label> <textarea id="_bs" name="bio_short" class="form-control" >' . htmlspecialchars($composer->bio_short) . '</textarea></div>';
  echo '<div class="form-group"><label for="_bf">Подробная биография</label> <textarea id="_bf" name="bio_full" class="form-control" >' . htmlspecialchars($composer->bio_full) . '</textarea></div>';

  echo '<input class="btn btn-primary" type="submit" value="Сохранить"/>';
  echo '</form>';
  
  $body = ob_get_contents();
  ob_end_clean();
  display($body, 'Редактировать информацию о &laquo;' . $composer->first_name . ' ' . $composer->last_name . '&raquo;');
}

function _editComposer()
{
  global $pdo;
  
  $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
  $composer = getComposer($pdo, $id);


  $composer->first_name = $_POST['first_name' ];
  $composer->last_name = $_POST['last_name'  ];
  $composer->image = $_POST['image'      ];
  $composer->years = $_POST['years'      ];
  $composer->about_short = $_POST['about_short'];
  $composer->about_full = $_POST['about_full' ];
  $composer->bio_short = $_POST['bio_short'  ];
  $composer->bio_full = $_POST['bio_full'   ];
  
  $composer = updateComposer($pdo, $composer);
  ob_end_clean();
  header('Location: /admin.php?route=composers');
}

function addComposer()
{
  ob_start();
  echo '<form action="?route=composer_add" method="POST">';

  echo '<div class="form-group"><label for="_name">Имя</label> <input id="_name" type="text" name="first_name"    value="" class="form-control" /></div>';
  echo '<div class="form-group"><label for="_last">Фамилия</label> <input id="_last" type="text" name="last_name" value="" class="form-control" /></div>';
  echo '<div class="form-group"><label for="_img">Изображение</label> <input id="img" type="text" name="image" value="" class="form-control" /></div>';
  echo '<div class="form-group"><label for="_years">Годы жизни</label> <input id="_years" type="text" name="years"  value="" class="form-control" /></div>';
  echo '<div class="form-group"><label for="_sd">Краткое описание</label> <textarea id="_sd" name="about_short" class="form-control" ></textarea></div>';
  echo '<div class="form-group"><label for="_fd">Подробное описание</label> <textarea id="_fd" name="about_full" class="form-control" ></textarea></div>';
  echo '<div class="form-group"><label for="_sb">Краткая биография</label> <textarea id="_sb" name="bio_short" class="form-control" ></textarea></div>';
  echo '<div class="form-group"><label for="_fb">Подробная биография</label> <textarea id="_fb" name="bio_full" class="form-control" ></textarea></div>';

  echo '<input class="btn btn-primary" type="submit" value="Сохранить"/>';
  echo '</form>';
  
  $body = ob_get_contents();
  ob_end_clean();
  display($body, 'Новая страница композитора');
}

function _addComposer()
{
  global $pdo;
  
  createComposer($pdo, $_POST);
  header('Location: /admin.php?route=composers');
}

function _removeComposer()
{
  global $pdo;
  $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);

  //removeComposer($pdo, $id);
  header('Location: /admin.php?route=composers');
}

function showPosters()
{
  ob_start();
  global $pdo;
  
  $posters = getPosters($pdo);
 
  echo '<table class="table">';

  echo '<tr><th>Афиша</th><th>Композитор</th><th></th></tr>';
  foreach ($posters as $poster) {
    $composer = getComposer($pdo, $poster->composer_id);
    
    echo '<tr><td><a href="?route=poster&id=' . $poster->id . '"><img src="' . $poster->image . '" style="width:90px"/></a></td>
<td>
' . $composer->first_name . ' ' . $composer->last_name . '
</td>

<td><a href="/admin.php?route=poster_remove&id=' . $poster->id . '">Удалить</a></td></tr>';
  }
  echo '</table>';
  $body = ob_get_contents();
  ob_end_clean();
  display($body, 'Афиши <a  class="btn btn-outline-primary" href="?route=poster_add">Создать афишу</a>');
}

function editPoster()
{
  ob_start();
  global $pdo;
  
  $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
  $poster = getPoster($pdo, $id);
  $composers = getComposers($pdo);
  
  
  echo '<form action="?route=poster&id=' . $poster->id . '" method="POST">';
  echo '<img src="' . $poster->image . '" style="width:90px"/>';
  echo '<div class="form-group"><label for="_url">URL</label><input name="url" id="_url" type="text" class="form-control" value="' . $poster->url . '"/></div>';
  echo '<div class="form-group"><label for="_d">Описание</label> <textarea name="description" id="_d" class="form-control" >' . htmlspecialchars($poster->description) . '</textarea></div>';
  echo '<div class="form-group"><label for="_c">Композитор</label> <select id="_c" name="composer_id" class="custom-select form-control" >';

  echo '<option value=""></option>';
  foreach ($composers as $composer) {
    echo '<option value="' . $composer->id . '"';
    if ($composer->id == $poster->composer_id)
      echo ' selected="selected"';
    echo '>' . $composer->first_name . ' ' . $composer->last_name . '</option>';
  }
  
  echo '</select></div>';
  echo '<input class="btn btn-primary" type="submit" value="Сохранить"/>';
  echo '</form>';
  
  $body = ob_get_contents();
  ob_end_clean();
  display($body, 'Редактировать афишу');
}

function _editPoster()
{
  global $pdo;
  
  $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
  $poster = getPoster($pdo, $id);

  $poster->url = $_POST['url'];
  $poster->description = $_POST['description'];
  $poster->composer_id = $_POST['composer_id'] ?: null;

  $poster = updatePoster($pdo, $poster);
  header('Location: /admin.php?route=posters');
}

function addPoster()
{
  global $pdo;
  $composers = getComposers($pdo);

  ob_start();
  echo '<form action="?route=poster_add" method="POST">';
  echo '<div class="form-group"><label for="_url">Афиша</label> <input class="form-control" type="text" name="image" value=""/></div>';
  echo '<div class="form-group"><label for="_url">URL</label> <input name="url" type="text" class="form-control" value=""/></div>';
  echo '<div class="form-group"><label for="_url">Описание</label> <textarea name="description" class="form-control" ></textarea></div>';

  echo '<div class="form-group"><label for="_url">Композитор</label> <select name="composer_id" class="custom-select form-control" >';
  echo '<option value=""></option>';
  foreach ($composers as $composer) {
    echo '<option value="' . $composer->id . '"';
    echo '>' . $composer->first_name . ' ' . $composer->last_name . '</option>';
  }
  echo '</select></div>';

  echo '<input class="btn btn-primary" type="submit" value="Сохранить"/>';
  echo '</form>';
  
  $body = ob_get_contents();
  ob_end_clean();
  display($body, 'Новая афиша');
}

function _addPoster()
{
  global $pdo;
  
  createPoster($pdo, $_POST);
  header('Location: /admin.php?route=posters');
}

function _removePoster()
{
  global $pdo;
  $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);

  removePoster($pdo, $id);
  header('Location: /admin.php?route=posters');
}
