var TODO = {
    db: null, maxId: 0,

    openDB: function() {
        db = window.openDatabase(
            'yjsuh_todo', '1.0', 'todo database', 2 * 1024 * 1024
        );

        TODO.load();
    },
    load: function() {
        db.transaction(function(tx) {
            var sql = 'create table if not exists m_todo_list ( '
                    + 'id REAL UNIQUE, note TEXT, ef_time DATE,'
                    + 'exp_time DATE)';
            tx.executeSql(sql);

            TODO.getList('all');
        });
    },
    setMaxId: function() {
        db.transaction(function(tx) {
            tx.executeSql('select max(id) from m_todo_list', [],
                function(tx, result) {
                    $.each(result.rows.item(0), function(k, val) {
                        maxId =  val == null ? 0 : val;
                    });
                },
                TODO.errorMSG
            );
        });
    },
    getList: function(viewType, id) {
        var todos = [];
        var todo_id = typeof id == 'undefined' ? 0 : id;

        db.transaction(function(tx) {
            var sql = "select id, note, ef_time, exp_time, "
                    + " case when exp_time > DATETIME('NOW') then 'all' "
                    + "      when exp_time <= DATETIME('NOW') then 'history' "
                    + " end as ishistory from m_todo_list where id > 0";

            if (viewType == 'history') {
                sql += " and  exp_time <= DATETIME('NOW') ";
            } else {
                sql += " and  exp_time > DATETIME('NOW') ";
            }
            if (todo_id != 0) {
                sql += " and id = ? ";
            }  else {
                sql += " and 0 = ? ";
            }

            sql += " order by ef_time desc ";
            tx.executeSql(sql, [todo_id],
                function(tx, result) {
                    for (i = 0; i < result.rows.length; i++)
                        todos.push(result.rows.item(i));

                    if (todo_id == 0) {
                        TODO.showList(todos);
                    } else {
                        TODO.showList(todos, 'view');
                    }
                },
                TODO.errorMSG
            );
        });
    },
    updateTodo: function(id, content) {
        db.transaction(function(tx) {
            var sql = "update m_todo_list set note = ? where id = ?";

            tx.executeSql(
                sql, [content, id],
                function(st, rst) {
                    TODO.alertMSG('modified');
                    TODO.removeList(); TODO.getList('all');
                },
                TODO.errorMSG
            );
        });
    },
    completeTodo: function(id) {
        db.transaction(function(tx) {
            var sql = "update  m_todo_list set exp_time = DATETIME('NOW') "
                    + " where id = ?";

            tx.executeSql(
                sql, [id],
                function(tx, rst) {
                    TODO.alertMSG('expired');
                    TODO.removeList(); TODO.getList('all');
                },
                TODO.errorMSG
            );
        });
    },
    addTodo: function(content) {
        db.transaction(function(tx) {
            var sql = "insert into m_todo_list values ("
                    + " ?, ?, DATETIME('NOW'), '9999-01-01 23:59:59')";

            var id = parseInt(maxId) + 1;
            tx.executeSql(
                sql, [id, content],
                function(tx, rst) {
                    TODO.alertMSG('Added');
                    TODO.removeList(); TODO.getList('all');
                },
                TODO.errorMSG
            );
        });
    },
    showList: function(todos, type) {
        if ($.isEmptyObject(todos)) {
            $('article.todo ol').append($('<li>').text('할 일을 등록하세요'));
        }

        $(todos).each(function(idx, row) {
            if (type != 'view') {
                var temp_note = TODO.chkStrLength(row.note) > 20
                              ? row.note.substr(0, 10) + '..' : row.note;

                var todo = $("<li>").attr('id', row.id).text(temp_note);
                if (row.ishistory == 'history') { todo.addClass('history'); }
                todo.append($("<span>").addClass('time').text(row.ef_time));

                todo.click(function() {
                    TODO.removeList();
                    var listType = row.ishistory == 'history'
                                  ? 'history' : 'all';
                    TODO.getList(listType, row.id);
                });
                $('article.todo ol').append(todo);
            } else {
                TODO.createForm(row);
            }
        });
    },
    createForm: function(row) {
        TODO.removeList();

        var todo = $('<div>').addClass('add');
        if (typeof row == 'undefined') {
            TODO.setMaxId();

            var button = TODO.createBtn('add', 'button-add', 'submit');

            button.click(function() {
                var content = $('div.add textarea').attr('value');
                TODO.addTodo(content);
                $('div.add').remove();
            });

            var button_cancel = TODO.createBtn('cancel', 'button-cancel', 'button');
            button_cancel.click(function() {
                $('div.add').remove(); TODO.getList('all');
            });

            todo.append($("<textarea>")).addClass('add').append(button)
                                                        .append(button_cancel);

            $('article.todo').append(todo);
        } else {
            todo.append($('<span>').addClass('time').text('작성일: ' + row.ef_time));

            if (row.ishistory == 'all') {

                var update_btn= TODO.createBtn('update', 'button-update', 'submit');
                var complete_btn = TODO.createBtn(
                    'complete', 'button-complete', 'submit'
                );

                update_btn.click(function() {
                    var content = $('div.add textarea').attr('value');
                    TODO.updateTodo(row.id, content);
                    $('div.add').remove();
                });

                complete_btn.click(function() {
                    TODO.completeTodo(row.id);
                    $('div.add').remove();
                });
            }

            var button_cancel = TODO.createBtn(
                'cancel', 'button-cancel', 'button'
            );
            button_cancel.click(function() {
                var listType = row.ishistory == 'all' ? 'all' : 'history';
                $('div.add').remove(); TODO.getList(listType);
            });

            todo.append($("<textarea>").text(row.note))
                                       .addClass('add').append(update_btn)
                                                       .append(complete_btn)
                                                       .append(button_cancel);

            $('article.todo').append(todo);
        }
    },
    createBtn: function(b_value, b_class, b_type) {
        return $('<button>').attr({
            type: b_type, value: b_value,
            'class': b_class
        }).text(b_value);
    },
    alertMSG: function(msg) {
        $('body').append($('<div>').addClass('notice').text(msg).css({
            'position': 'absolute',
            'right': '6px',
            'top' : $('div.notice').position() == null
                    ? 120 + 'px'
                    : $('div.notice').last().position().top + 34 + 'px'
        }).animate({opacity: 0.1}, 3000, function() { $(this).remove() }));
    },
    removeList: function() { $('article.todo ol li').remove(); },
    errorMSG: function(tx, e) { alert('Error: ' + e.message); },
    chkStrLength: function(str) {
        // 입력받은 문자열을 escape() 를 이용하여 변환한다.
        // 변환한 문자열 중 유니코드(한글 등)는 공통적으로 %uxxxx로 변환된다.
        var temp_estr = escape(str);
        var s_index   = 0;
        var e_index   = 0;
        var temp_str  = "";
        var cnt       = 0;

        // 문자열 중에서 유니코드를 찾아 제거하면서 갯수를 센다.
        // 제거할 문자열이 존재한다면
        while ((e_index = temp_estr.indexOf("%u", s_index)) >= 0)  {
            temp_str += temp_estr.substring(s_index, e_index);
            s_index = e_index + 6;
            cnt ++;
        }

        temp_str += temp_estr.substring(s_index);
        temp_str = unescape(temp_str);  // 원래 문자열로 바꾼다.
        // 유니코드는 2바이트 씩 계산하고 나머지는 1바이트씩 계산한다.
        return ((cnt * 2) + temp_str.length) + "";
    }
}
