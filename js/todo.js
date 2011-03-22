var TODO = {
    db: null, maxId: 0, minLeft: 10,
    isMobile: navigator.userAgent.match(/iPod|Android/) != null,
    screen_w: window.screen.width, screen_h: window.screen.height,
    ishistory: false,

    openDB: function() {
        db = window.openDatabase(
            'yjseo_todo', '1.0', 'todo database', 2 * 1024 * 1024
        );

        TODO.load();
    },
    load: function() {
        db.transaction(function(tx) {
            var sql = 'create table if not exists todo_list ( ' 
                    + 'id REAL UNIQUE, note TEXT, ef_time DATE,'
                    + 'left TEXT, top TEXT, zindex REAL, exp_time DATE)';
            tx.executeSql(sql);

            TODO.getList();
        });
    }, 
    savePosition: function(x, y, id) {
        db.transaction(function(tx) {
            var sql = "update todo_list set left = ?, top = ?  where id = ?";
            tx.executeSql(sql, [parseInt(x), parseInt(y), id],
                function(tx, rst) { },
                TODO.errorMSG
            );
        });
    },
    setMaxId: function() {
        db.transaction(function(tx) {
            tx.executeSql('select max(id) from todo_list', [], 
                function(tx, result) {
                    $.each(result.rows.item(0), function(k, val) {
                        maxId =  val == null ? 0 : val;
                    });
                }, 
                TODO.errorMSG
            );
        });
    },
    setMinLeft: function() {
        db.transaction(function(tx) {
            tx.executeSql(
                'select min(left) from todo_list', [], 
                function(tx, result) {
                    $.each(result.rows.item(0), function(k, val) {
                        TODO.minLeft = val != 10
                                     ? TODO.minLeft : TODO.minLeft + 30;
                    });
                }, 
                TODO.errorMSG
            );
        });
    },
    getList: function(mode) {
        if (mode == 'history') TODO.ishistory = true;
        var todos = [];
        mode = typeof mode == 'undefined' ? '' : mode;
        var delimited = mode == 'history' ? "<=" : ">";
        var add_sql = " exp_time " + delimited + " DATETIME('NOW') ";

        db.transaction(function(tx) {
            var sql = "select * from todo_list where"
                    + add_sql;

            tx.executeSql(sql, [], 
                function(tx, result) {
                    for (i = 0; i < result.rows.length; i++) 
                        todos.push(result.rows.item(i));
                    TODO.showTodo(todos, mode);
                }, 
                TODO.errorMSG
            );
        });
    },
    updateTodo: function(id) {
        db.transaction(function(tx) {
            var sql = "update todo_list set note = ? where id = ?";
            var content =  $('article#' + id  + ' textarea').attr('value');

            tx.executeSql(
                sql, [content, id],
                function(st, rst) { 
                    TODO.alertMSG('modified');
                    $('article.todo').remove(); TODO.getList(); 
                    if (TODO.ishistory) TODO.getList('history');
                },
                TODO.errorMSG
            );
        });
    },
    completeTodo: function(id) { 
        db.transaction(function(tx) {
            var sql = "update  todo_list set exp_time = DATETIME('NOW') "
                    + " where id = ?";

            tx.executeSql(
                sql, [id],
                function(tx, rst) { 
                    TODO.alertMSG('expired');
                    $('article.todo').remove(); TODO.getList(); 
                    if (TODO.ishistory) TODO.getList('history');
                },
                TODO.errorMSG
            );
        });
    },
    addTodo: function(content) {
        db.transaction(function(tx) {
            var sql = "insert into todo_list values (" 
                    + "?, ?, DATETIME('NOW'), ?, '125', ?, "
                    + "'9999-01-01 23:59:59')";

            var id = parseInt(maxId) + 1;
            tx.executeSql(
                sql, [id, content, TODO.minLeft, id],
                function(tx, rst) { 
                    TODO.alertMSG('Added'); 
                    $('article.todo').remove(); TODO.getList(); 
                    if (TODO.ishistory) TODO.getList('history');
                },
                TODO.errorMSG
            );
        });
    },
    showTodo: function(todos, mode) {
        $(todos).each(function(idx, row) {
            var todo = $("<article>").addClass('todo ' + mode)
                     .attr('id', row.id);
            if (!TODO.isMobile) {
                todo.draggable().css({
                    'position': 'absolute',
                    'left': row.left + 'px', 
                    'top': row.top == 0 ? '120px' :  row.top + 'px',
                    'z-index': row.zindex
                });
            }
            
            todo.append($("<span>").addClass('time').text(
                'regdate: ' + row.ef_time
            ));

            $(['complete', 'update']).each(function(tid, type) {
                var t_title = type != 'update' ? '완료' : '수정';
                var msg = type != 'update' ? '완료하겠습니까?' : '수정할래요?';

                todo.append($("<span>").addClass(type + ' ' +  row.id)
                    .text(type).attr({title: t_title}).click(function() {
                    if (confirm(msg)) eval("TODO." + type + "Todo(row.id)"); 
                }));
            });

            $('body').append(todo.append($("<textarea>").text(row.note)));
        });
        TODO.initMouseupEvent();
    },
    createForm: function() {
        TODO.setMaxId(); TODO.setMinLeft();
        
        var background = $('<div>').addClass('background').click(function() {
            TODO.removeForm();
        });

        $('body').append(background.animate({ opacity: 0.5 }, 0));

        var todo = $("<article>").addClass('todo add').css({
            'z-index': '1000', 'left': '100px'
        }).draggable();
        todo.append($("<h2>").text('Todo Add'));

        var button = TODO.createBtn('add', 'button-add', 'submit');
        button.click(function() {
            var content = $('article.add textarea').attr('value');
            TODO.addTodo(content); TODO.removeForm();
        });

        var button_cancel = TODO.createBtn('cancel', 'button-cancel', 'button');
        button_cancel.click(function() { TODO.removeForm(); });

        todo.append($("<textarea>")).addClass('add').append(button)
                                                    .append(button_cancel);

        $('body').append(todo);
    },
    createBtn: function(b_value, b_class, b_type) {
        return $('<button>').attr({ 
            type: b_type, value: b_value,
            'class': b_class
        }).text(b_value);
    },
    removeForm: function() {
        $('article.add, div.background').animate({ opacity: 0.1 }, 1000, 
            function() { $(this).remove(); }
        ); 
    }, 
    initMouseupEvent: function() {
        $('article').mouseup(function() {
            var temp_id = $(this).attr('id');
            var temp_left = $(this).position().left;
            var temp_top = $(this).position().top;
            TODO.savePosition(temp_left, temp_top, temp_id);
        });
    },
    alertMSG: function(msg) {
        $('body').append($('<div>').addClass('notice').text(msg).css({
            'position': 'absolute',
            'right': '6px',
            'top' : $('div.notice').position() == null 
                    ? 120 + 'px' 
                    : $('div.notice').last().position().top + 34 + 'px'
        }).animate({opacity: 0.1}, 5000, function() { $(this).remove() }));
    },
    errorMSG: function(tx, e) { alert('Error: ' + e.message); }
}
