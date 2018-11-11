<?php
function getConcerts($composer)
{
  if ($composer->last_name == 'Рахманинов') {
    return [
	    (object)[

		     'title' => "Элегическое трио № 1 соль минор",
		     'date' => "2018-11-14",
		     'time' => "19:00",
		     'performer' => "Концертный зал имени П. И. Чайковского",
		     'tickets_url' => 'https://bigbilet.ru/ticket-sale/ticket/?owner=BF1EE8A0D65E9803E040115529B054C7&id_service=62238BF68E986059E0504B5E01F56877&id_agent=BF1EE8A0D65E9803E040115529B054C7&locale=ru'
],
	    (object)[

		     'title' => "Рапсодия на тему Паганини для фортепиано с оркестром ля минор, соч. 43",
		     'date' => "2018-11-17",
		     'time' => "19:00",
		     'performer' => "Концертный зал имени П. И. Чайковского",
		     'tickets_url' => 'https://bigbilet.ru/ticket-sale/ticket/?owner=BF1EE8A0D65E9803E040115529B054C7&id_service=62238BF68DEE6059E0504B5E01F56877&id_agent=BF1EE8A0D65E9803E040115529B054C7&locale=ru'
		     
		     ],

	    (object)[

		     'title' => "«Остров мёртвых» – симфоническая поэма по картине А.Бёклина, соч. 29",
		     'date' => "2018-11-17",
		     'time' => "19:00",
		     'performer' => "Концертный зал имени П. И. Чайковского",
		     'tickets_url' => 'https://bigbilet.ru/ticket-sale/ticket/?owner=BF1EE8A0D65E9803E040115529B054C7&id_service=62238BF68DEE6059E0504B5E01F56877&id_agent=BF1EE8A0D65E9803E040115529B054C7&locale=ru'
		     
		     ],
	    (object)[

		     'title' => "«Всенощное бдение» для хора a cappella, соч. 37",
		     'date' => "2018-11-26",
		     'time' => "19:00",
		     'performer' => "Концертный зал имени П. И. Чайковского",
		     'tickets_url' => 'https://bigbilet.ru/ticket-sale/ticket/?owner=BF1EE8A0D65E9803E040115529B054C7&id_service=77FBB8EA245738FDE0504B5E01F54B2F&id_agent=BF1EE8A0D65E9803E040115529B054C7&locale=ru'
		     ],

	    (object)[

		     'title' => "Концерт № 3 для фортепиано с оркестром ре минор, соч. 30",
		     'date' => "2018-12-18",
		     'time' => "19:00",
		     'performer' => "Концертный зал имени П. И. Чайковского",
		     'tickets_url' => 'https://bigbilet.ru/ticket-sale/ticket/?owner=BF1EE8A0D65E9803E040115529B054C7&id_service=62238BF68E726059E0504B5E01F56877&id_agent=BF1EE8A0D65E9803E040115529B054C7&locale=ru'
		     ],
	    ];
    
  } elseif ($composer->last_name == 'Чайковский') {
    return [
	    (object)[

		     'title' => "Симфония № 5 ми минор, соч. 64",
		     'date' => "2018-11-17",
		     'time' => "19:00",
		     'performer' => "Концертный зал имени П. И. Чайковского",
		     'tickets_url' => 'https://bigbilet.ru/ticket-sale/ticket/?owner=BF1EE8A0D65E9803E040115529B054C7&id_service=62238BF68DEE6059E0504B5E01F56877&id_agent=BF1EE8A0D65E9803E040115529B054C7&locale=ru'
		     ],
	    (object)[

		     'title' => "Симфония No. 6 си минор («Патетическая»)",
		     'date' => "2018-11-21",
		     'time' => "19:00",
		     'performer' => "
                        «Филармония-2». Концертный&nbsp;зал&nbsp;<br>имени С.&nbsp;В.&nbsp;Рахманинова
                      ",
		     'tickets_url' => 'https://bigbilet.ru/ticket-sale/ticket/?owner=BF1EE8A0D65E9803E040115529B054C7&id_service=62ECB65FD06AC976E0504B5E01F5753B&id_agent=BF1EE8A0D65E9803E040115529B054C7&locale=ru'
		     ],
	    (object)[

		     'title' => "Сюита из музыки к балету «Щелкунчик» для оркестра, соч. 71a",
		     'date' => "2018-12-20",
		     'time' => "19:00",
		     'performer' => "
                        Большой зал Консерватории
                      ",
		     'tickets_url' => 'https://bigbilet.ru/ticket-sale/ticket/?owner=BF1EE8A0D65E9803E040115529B054C7&id_service=623789EE7586AA92E0504B5E01F57E37&id_agent=BF1EE8A0D65E9803E040115529B054C7&locale=ru'
		     ],

	    ];
  } else {
    return [];
  }
  
}
