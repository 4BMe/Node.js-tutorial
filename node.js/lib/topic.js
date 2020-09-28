var db = require('./db');
var template = require('./template.js');
var url = require('url');
var qs = require('querystring');
var sanitizeHtml = require('sanitize-html');
var cookie = require('cookie'); 

function authIsOwner(request, response){
  var isOwner = false;
  var cookies = {};
  if (request.headers.cookie){
    cookies = cookie.parse(request.headers.cookie);
  }
  if (cookies.email === 'a' && cookies.password === 'a'){
    isOwner = true;
  }
  return isOwner;
}

function authStatusUI(request, response) {
  var authStatusUI = '<a href="/login">login</a>';
  if (authIsOwner(request, response)) {
    authStatusUI = '<a href="/logout_process">logout</a>';
  }
  return authStatusUI;
}

exports.home = function(request, response){
  db.query(`SELECT * FROM topic`, function(error,topics){
      var title = 'Welcome';
      var description = 'Hello, Node.js';
      var list = template.list(topics);
      var html = template.HTML(title, list,
        `<h2>${title}</h2>${description}`,
        `<a href="/create">create</a>`,
        authStatusUI(request, response)
      );
      response.writeHead(200);
      response.end(html);
  });
}
 
exports.page = function(request, response){
    var _url = request.url;
    var queryData = url.parse(_url, true).query;
    db.query(`SELECT * FROM topic`, function(error,topics){
        if(error){
          throw error;
        }
        db.query(`SELECT * FROM topic LEFT JOIN author ON topic.author_id=author.id WHERE topic.id=?`,[queryData.id], function(error2, topic){
          if(error2){
            throw error2;
          }
         var title = topic[0].title;
         var description = topic[0].description;
         var list = template.list(topics);
         var html = template.HTML(title, list,
           `
           <h2>${sanitizeHtml(title)}</h2>
           ${sanitizeHtml(description)}
           <p>by ${sanitizeHtml(topic[0].name)}</p>
           `,
           ` 
             <a href="/create">create</a>
             <a href="/update?id=${queryData.id}">update</a>
             <form action="delete_process" method="post">
               <input type="hidden" name="id" value="${queryData.id}">
               <input type="submit" value="delete">
             </form>
           `,
           authStatusUI(request, response)
         );
         response.writeHead(200);
         response.end(html);
        })
     });
}
 
exports.create = function(request, response){
    db.query(`SELECT * FROM topic`, function(error,topics){
        db.query('SELECT * FROM author', function(error2, authors){
          var title = 'Create';
          var list = template.list(topics);
          var html = template.HTML(sanitizeHtml(title), list,
            `
            <form action="/create_process" method="post">
              <p><input type="text" name="title" placeholder="title"></p>
              <p>
                <textarea name="description" placeholder="description"></textarea>
              </p>
              <p>
                ${template.authorSelect(authors)}
              </p>
              <p>
                <input type="submit">
              </p>
            </form>
            `,
            `<a href="/create">create</a>`,
            authStatusUI(request, response)

          );
          response.writeHead(200);
          response.end(html);
        });
      });
}
 
exports.create_process = function(request, response){
  if(authIsOwner(request, response) === false){
    response.end('Login required!!');
    return false;
  }
  var body = '';
    request.on('data', function(data){
        body = body + data;
    });
    request.on('end', function(){
      var post = qs.parse(body);
      db.query(`
        INSERT INTO topic (title, description, created, author_id) 
        VALUES(?, ?, NOW(), ?)`,
        [post.title, post.description, post.author], 
        function(error, result){
          if(error){
            throw error;
          }
          response.writeHead(302, {Location: `/?id=${result.insertId}`});
          response.end();
        }
        )
    });
}
 
exports.update = function(request, response){
    var _url = request.url;
    var queryData = url.parse(_url, true).query;
    db.query('SELECT * FROM topic', function(error, topics){
        if(error){
          throw error;
        }
        db.query(`SELECT * FROM topic WHERE id=?`,[queryData.id], function(error2, topic){
          if(error2){
            throw error2;
          }
          db.query('SELECT * FROM author', function(error2, authors){
            var list = template.list(topics);
            var html = template.HTML(sanitizeHtml(topic[0].title), list,
              `
              <form action="/update_process" method="post">
                <input type="hidden" name="id" value="${topic[0].id}">
                <p><input type="text" name="title" placeholder="title" value="${sanitizeHtml(topic[0].title)}"></p>
                <p>
                  <textarea name="description" placeholder="description">${sanitizeHtml(topic[0].description)}</textarea>
                </p>
                <p>
                  ${template.authorSelect(authors, topic[0].author_id)}
                </p>
                <p>
                  <input type="submit">
                </p>
              </form>
              `,
              `<a href="/create">create</a> <a href="/update?id=${topic[0].id}">update</a>`,
              authStatusUI(request, response)
            );
            response.writeHead(200);
            response.end(html);
          });
           
        });
      });
}
 
exports.update_process = function(request, response){
  if(authIsOwner(request, response) === false){
    response.end('Login required!!');
    return false;
  }
    var body = '';
      request.on('data', function(data){
          body = body + data;
      });
      request.on('end', function(){
          var post = qs.parse(body);
          db.query('UPDATE topic SET title=?, description=?, author_id=? WHERE id=?', [post.title, post.description, post.author, post.id], function(error, result){
            response.writeHead(302, {Location: `/?id=${post.id}`});
            response.end();
          })
      });
}
 
exports.delete_process = function(request, response){
  if(authIsOwner(request, response) === false){
    response.end('Login required!!');
    return false;
  }
    var body = '';
      request.on('data', function(data){
          body = body + data;
      });
      request.on('end', function(){
          var post = qs.parse(body);
          db.query('DELETE FROM topic WHERE id = ?', [post.id], function(error, result){
            if(error){
              throw error;
            }
            response.writeHead(302, {Location: `/`});
            response.end();
          });
      });
}

exports.login = function(request, response){
  db.query(`SELECT * FROM topic`, function(error,topics){
      var title = 'Login';
      var list = template.list(topics);
      var html = template.HTML(title, list,
        `
        <form action="login_process" method="post">
          <p><input type="text" name="email" placeholder="email"></p>
          <p><input type="password" name="password" placeholder="password"></p>
          <p><input type="submit"></p>
        </form>
        `,
        `<a href="/create">create</a>`,
        authStatusUI(request, response)
      );
      response.writeHead(200);
      response.end(html);
  });
}

exports.login_process = function(request, response){
  var body = '';
  request.on('data', function(data){
    body = body + data;
    });
  request.on('end', function(){
    var post = qs.parse(body);
    if (post.email === 'a' && post.password === 'a'){
      response.writeHead(302,{
        'Set-Cookie':[
          `email=${post.email}`,
          `password=${post.password}`,
          `nickname=AA`
        ],
        Location: `/`
      });
      response.end();
    } else {
      response.end('Who R U?');
    }
  });
}

exports.logout_process = function(request, response){
  var body = '';
  request.on('data', function(data){
    body = body + data;
    });
  request.on('end', function(){
    var post = qs.parse(body);
      response.writeHead(302,{
        'Set-Cookie':[
          `email=; Max-Age=0`,
          `password=; Max-Age=0`,
          `nickname=; Max-Age=0`
        ],
        Location: `/`
      });
      response.end();
    
  });
}
