/*
OAuth daemon
Copyright (C) 2013 Webshell SAS

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
 any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
*/

var request = require('request');
var config = require('../lib/config');
var querystring = require('querystring');

config.redis.database = 7; // select a sandbox database (0~15). MUST be empty.

/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/

var gb;

function check_setUp(callback) {
  return function _check_setUp(test) {
    if (gb && gb.skip) {
      test.ok(false, "Skipping test");
      return test.done();
    }
    if (gb) return callback(test);
    test._ok = test.ok;
    test._expect = test.expect;
    test.ok = function (a, b) { if (!a) test._nok_=true; test._ok(a,b); }
    test.expect = function (i) { return test._expect(i+4); }
    var oauthd = require('../lib/oauthd');
    console.log("");
    oauthd.plugins.data.on('server', function(err) {
      oauthd.plugins.data.db.redis.info(function(e,v) {
        test.ok(!e, e && e.message);
        var redis_version = v.match(/redis_version:([0-9.]+)/);
        test.ok(redis_version && redis_version[1]);
        redis_version = redis_version[1].toString().split('.');

        oauthd.plugins.data.db.redis.randomkey(function (e,v) {
          test.ok(!e, e && e.message);
          test.ok(!v, 'selected database MUST be empty !');
          gb = {
            oauthd: oauthd,
            shared: oauthd.plugins.data,
            db: oauthd.plugins.data.db,
            redis_version: redis_version,
            skip: test._nok_
          };
          return callback(test);
        });
      });
    });
  }
}

exports.endpoints = {
  'admin': check_setUp(function(t) {
    t.expect(2);
    request(config.host_url + config.base + '/admin', function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 200, 'invalid statusCode');
      t.done();
    });
  }),
  'sdk': check_setUp(function(t) {
    t.expect(4);
    request(config.host_url + config.base + '/download/latest/oauth.js', function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 200, 'invalid statusCode');
      t.ok(body.indexOf("redirect: function(provider, opts, url)") != -1, "incorrect body");
      t.ok(body.indexOf("popup: function(provider, opts, callback)") != -1, "incorrect body");
      t.done();
    });
  }),
  'sdk (min)': check_setUp(function(t) {
    t.expect(4);
    request(config.host_url + config.base + '/download/latest/oauth.min.js', function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 200, 'invalid statusCode');
      t.ok(body.indexOf("redirect:function(") != -1, "incorrect body");
      t.ok(body.indexOf("popup:function(") != -1, "incorrect body");
      t.done();
    });
  })
};

exports.admin_auth = {
  'register': check_setUp(function(t) {
    t.expect(6);
    request.post({
      url: config.host_url + config.base + '/token',
      auth: {user:'testlogin', pass:'testpass'},
      form: {grant_type:'client_credentials'}
    }, function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 200, 'invalid statusCode');
      var data;
      t.doesNotThrow(function(){data=JSON.parse(body);}, "could not parse body");
      t.ok(data.access_token, "incorrect body (access_token)");
      t.equal(data.token_type, "Bearer", "incorrect body (token_type)");
      t.ok(data.expires_in, "incorrect body (expires_in)");
      t.done();
    });
  }),
  'bad credentials': check_setUp(function(t) {
    t.expect(5);
    request.post({
      url: config.host_url + config.base + '/token',
      auth: {user:'testlogin', pass:'testpassthatdoesnotexists'},
      form: {grant_type:'client_credentials'}
    }, function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 403, 'invalid statusCode');
      var data;
      t.doesNotThrow(function(){data=JSON.parse(body);}, "could not parse body");
      t.ok(data.error_description, "incorrect body (error_description)");
      t.equal(data.error, "invalid_client", "incorrect body (error)");
      t.done();
    });
  }),
  'sign in': check_setUp(function(t) {
    t.expect(6);
    request.post({
      url: config.host_url + config.base + '/token',
      auth: {user:'testlogin', pass:'testpass'},
      form: {grant_type:'client_credentials'}
    }, function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 200, 'invalid statusCode');
      var data;
      t.doesNotThrow(function(){data=JSON.parse(body);}, "could not parse body");
      t.ok(data.access_token, "incorrect body (access_token)");
      t.equal(data.token_type, "Bearer", "incorrect body (token_type)");
      t.ok(data.expires_in, "incorrect body (expires_in)");
      gb.auth_request = request.defaults({headers:{'Authorization':'Bearer ' + data.access_token}});
      t.done();
    });
  })
};

exports.admin_api_create = {
  'app': check_setUp(function(t) {
    t.expect(7);
    gb.auth_request.post({
      url: config.host_url + config.base + '/api/apps',
      form: {name: 'A test app'}
    }, function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 200, 'invalid statusCode');
      var data;
      t.doesNotThrow(function(){data=JSON.parse(body);}, "could not parse body");
      t.equal(data.status, "success", "api replied an error");
      t.ok(typeof data.data == 'object', "malformed response");
      t.equal(data.data.name, "A test app");
      t.ok(typeof data.data.key == 'string', "invalid response (key)");
      gb.app_key = data.data.key;
      t.done();
    });
  }),
  'domain': check_setUp(function(t) {
    t.expect(4);
    gb.auth_request.post({
      url: config.host_url + config.base + '/api/apps/' + gb.app_key + '/domains/test.local'
    }, function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 200, 'invalid statusCode');
      var data;
      t.doesNotThrow(function(){data=JSON.parse(body);}, "could not parse body");
      t.deepEqual(data, {status:'success',data:null}, "api replied an error");
      t.done();
    });
  }),
  'keyset': check_setUp(function(t) {
    t.expect(4);
    gb.auth_request.post({
      url: config.host_url + config.base + '/api/apps/' + gb.app_key + '/keysets/facebook',
      form: {client_id:"aaaa", client_secret:"bbbbbbbbb", scope: ["yy", "zz"]}
    }, function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 200, 'invalid statusCode');
      var data;
      t.doesNotThrow(function(){data=JSON.parse(body);}, "could not parse body");
      t.deepEqual(data, {status:'success',data:null}, "api replied an error");
      t.done();
    });
  }),
  'check keysets': check_setUp(function(t) {
    t.expect(4);
    gb.auth_request.get(config.host_url + config.base + '/api/apps/' + gb.app_key + '/keysets', function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 200, 'invalid statusCode');
      var data;
      t.doesNotThrow(function(){data=JSON.parse(body);}, "could not parse body");
      t.deepEqual(data, {
        status:"success",
        data: ['facebook']
      }, "api replied an error");
      t.done();
    });
  }),
  'check keyset': check_setUp(function(t) {
    t.expect(4);
    gb.auth_request.get(config.host_url + config.base + '/api/apps/' + gb.app_key + '/keysets/facebook', function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 200, 'invalid statusCode');
      var data;
      t.doesNotThrow(function(){data=JSON.parse(body);}, "could not parse body");
      t.deepEqual(data, {
        status:"success",
        data: {client_id:"aaaa", client_secret:"bbbbbbbbb", scope: ["yy", "zz"]}
      }, "api replied an error");
      t.done();
    });
  }),
  'check domains': check_setUp(function(t) {
    t.expect(4);
    gb.auth_request.get(config.host_url + config.base + '/api/apps/' + gb.app_key + '/domains', function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 200, 'invalid statusCode');
      var data;
      t.doesNotThrow(function(){data=JSON.parse(body);}, "could not parse body");
      t.deepEqual(data, {
        status:"success",
        data: ['test.local']
      }, "api replied an error");
      t.done();
    });
  }),
  'check app': check_setUp(function(t) {
    t.expect(4);
    gb.auth_request.get(config.host_url + config.base + '/api/apps/' + gb.app_key, function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 200, 'invalid statusCode');
      var data;
      t.doesNotThrow(function(){data=JSON.parse(body);}, "could not parse body");
      t.deepEqual(data, {
        status:"success",
        data: {
          name:"A test app",
          key:gb.app_key,
          domains:['test.local'],
          keysets:['facebook']
        }
      }, "api replied an error");
      t.done();
    });
  }),
  'check me': check_setUp(function(t) {
    t.expect(4);
    gb.auth_request.get(config.host_url + config.base + '/api/me', function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 200, 'invalid statusCode');
      var data;
      t.doesNotThrow(function(){data=JSON.parse(body);}, "could not parse body");
      t.deepEqual(data, {status:'success',data:{apps:[gb.app_key]}}, "api replied an error");
      t.done();
    });
  })
};

exports.admin_api_update = {
  'app': check_setUp(function(t) {
    t.expect(4);
    gb.auth_request.post({
      url: config.host_url + config.base + '/api/apps/' + gb.app_key,
      form: {name: 'Renamed app'}
    }, function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 200, 'invalid statusCode');
      var data;
      t.doesNotThrow(function(){data=JSON.parse(body);}, "could not parse body");
      t.deepEqual(data, {status:'success',data:null}, "api replied an error");
      t.done();
    });
  }),
  'app key': check_setUp(function(t) {
    t.expect(7);
    gb.auth_request.post({
      url: config.host_url + config.base + '/api/apps/' + gb.app_key + '/reset',
      form: {name: 'Renamed app'}
    }, function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 200, 'invalid statusCode');
      var data;
      t.doesNotThrow(function(){data=JSON.parse(body);}, "could not parse body");
      t.equal(data.status, "success", "api replied an error");
      t.ok(typeof data.data == 'object', "malformed response");
      t.ok(typeof data.data.key == 'string', "invalid response (key)");
      t.notEqual(data.data.key, gb.app_key, "invalid response (key)");
      gb.app_key = data.data.key;
      t.done();
    });
  }),
  'domains': check_setUp(function(t) {
    t.expect(4);
    gb.auth_request.post({
      url: config.host_url + config.base + '/api/apps/' + gb.app_key + '/domains',
      form: {domains: ['test1.local', 'test2.local']}
    }, function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 200, 'invalid statusCode');
      var data;
      t.doesNotThrow(function(){data=JSON.parse(body);}, "could not parse body");
      t.deepEqual(data, {status:'success',data:null}, "api replied an error");
      t.done();
    });
  }),
  'keyset': check_setUp(function(t) {
    t.expect(4);
    gb.auth_request.post({
      url: config.host_url + config.base + '/api/apps/' + gb.app_key + '/keysets/facebook',
      form: {client_id:"AAAAA", client_secret:"BBBBBBB", scope: ["YY", "ZZ"]}
    }, function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 200, 'invalid statusCode');
      var data;
      t.doesNotThrow(function(){data=JSON.parse(body);}, "could not parse body");
      t.deepEqual(data, {status:'success',data:null}, "api replied an error");
      t.done();
    });
  }),
  'check keyset': check_setUp(function(t) {
    t.expect(4);
    gb.auth_request.get(config.host_url + config.base + '/api/apps/' + gb.app_key + '/keysets/facebook', function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 200, 'invalid statusCode');
      var data;
      t.doesNotThrow(function(){data=JSON.parse(body);}, "could not parse body");
      t.deepEqual(data, {
        status:"success",
        data: {client_id:"AAAAA", client_secret:"BBBBBBB", scope: ["YY", "ZZ"]}
      }, "api replied an error");
      t.done();
    });
  }),
  'check domains': check_setUp(function(t) {
    t.expect(4);
    gb.auth_request.get(config.host_url + config.base + '/api/apps/' + gb.app_key + '/domains', function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 200, 'invalid statusCode');
      var data;
      t.doesNotThrow(function(){data=JSON.parse(body);}, "could not parse body");
      if (data && Array.isArray(data.data))
        data.data.sort();
      t.deepEqual(data, {
        status:"success",
        data: ['test1.local', 'test2.local']
      }, "api replied an error");
      t.done();
    });
  }),
  'check app': check_setUp(function(t) {
    t.expect(4);
    gb.auth_request.get(config.host_url + config.base + '/api/apps/' + gb.app_key, function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 200, 'invalid statusCode');
      var data;
      t.doesNotThrow(function(){data=JSON.parse(body);}, "could not parse body");
      if (data && data.data && Array.isArray(data.data.domains))
        data.data.domains.sort();
      t.deepEqual(data, {
        status:"success",
        data: {
          name:"Renamed app",
          key:gb.app_key,
          domains:['test1.local', 'test2.local'],
          keysets:['facebook']
        }
      }, "api replied an error");
      t.done();
    });
  }),
  'check me': check_setUp(function(t) {
    t.expect(4);
    gb.auth_request.get(config.host_url + config.base + '/api/me', function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 200, 'invalid statusCode');
      var data;
      t.doesNotThrow(function(){data=JSON.parse(body);}, "could not parse body");
      t.deepEqual(data, {status:'success',data:{apps:[gb.app_key]}}, "api replied an error");
      t.done();
    });
  })
}

exports.admin_api_providers = {
  'list': check_setUp(function(t) {
    t.expect(6);
    gb.auth_request.get(config.host_url + config.base + '/api/providers', function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 200, 'invalid statusCode');
      var data;
      t.doesNotThrow(function(){data=JSON.parse(body);}, "could not parse body");
      t.equal(data.status, 'success', "api replied an error");
      t.ok(Array.isArray(data.data), "api replied an error (data)");
      t.ok(Array.isArray(data.data) && data.data.indexOf('facebook') != -1, "missing providers ?");
      t.done();
    });
  }),
  'facebook': check_setUp(function(t) {
    t.expect(6);
    gb.auth_request.get(config.host_url + config.base + '/api/providers/facebook', function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 200, 'invalid statusCode');
      var data;
      t.doesNotThrow(function(){data=JSON.parse(body);}, "could not parse body");
      t.equal(data.status, 'success', "api replied an error");
      t.ok(typeof data.data == 'object' &&
        data.data.url && data.data.oauth2 && data.data.name && data.data.href && data.data.provider,
        "api replied an error (data)");
      gb.facebook_url = data.data && data.data.url;
      gb.facebook_auth = data.data && data.data.oauth2 && data.data.oauth2.authorize && data.data.oauth2.authorize.url;
      t.ok(gb.facebook_auth, "malformed authorize");
      t.done();
    });
  }),
  'facebook (extend)': check_setUp(function(t) {
    t.expect(7);
    gb.auth_request.get(config.host_url + config.base + '/api/providers/facebook?extend=true', function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 200, 'invalid statusCode');
      var data;
      t.doesNotThrow(function(){data=JSON.parse(body);}, "could not parse body");
      t.equal(data.status, 'success', "api replied an error");
      t.ok(typeof data.data == 'object' &&
        data.data.url && data.data.oauth2 && data.data.name && data.data.href && data.data.provider,
        "api replied an error (data)");
      var facebook_auth = data.data && data.data.oauth2 && data.data.oauth2.authorize && data.data.oauth2.authorize.url;
      t.ok(facebook_auth, "malformed authorize");
      t.equal(gb.facebook_url + gb.facebook_auth, facebook_auth, "authorize url does not match");
      t.done();
    });
  }),
}

exports.oauth_popup = {
  'popup': check_setUp(function(t) {
    t.expect(4);
    request.get({
      url: config.host_url + config.base + '/auth/facebook',
      qs: {k:gb.app_key, d:'http://test1.local/whatever', opts:'{"authorize":{"view":"touch"}}'},
      followRedirect: false
    }, function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 302, 'invalid statusCode');
      var state = response.headers['location'] && response.headers['location'].match(/%3Fstate%3D(.+)&/);
      state = state && state[1];
      t.ok(state, 'could not find state');
      var query = querystring.stringify({
        view: 'touch',
        scope: "YY,ZZ",
        redirect_uri:config.host_url + config.base + '/?state=' + state,
        client_id:"AAAAA"
      })
      t.equal(response.headers['location'],
        'https://graph.facebook.com/oauth/authorize?' + query,
        'wrong redirection url');
      t.done();
    });
  }),
  'redirect': check_setUp(function(t) {
    t.expect(4);
    request.get({
      url: config.host_url + config.base + '/auth/facebook',
      qs: {k:gb.app_key, redirect_uri:'http://test1.local/whatever', opts:'{"authorize":{"view":"touch"}}'},
      followRedirect: false
    }, function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 302, 'invalid statusCode');
      var state = response.headers['location'] && response.headers['location'].match(/%3Fstate%3D(.+)&/);
      state = state && state[1];
      t.ok(state, 'could not find state');
      var query = querystring.stringify({
        view: 'touch',
        scope: "YY,ZZ",
        redirect_uri:config.host_url + config.base + '/?state=' + state,
        client_id:"AAAAA"
      })
      t.equal(response.headers['location'],
        'https://graph.facebook.com/oauth/authorize?' + query,
        'wrong redirection url');
      gb.state = state;
      t.done();
    });
  })
}

exports.admin_api_delete = {
  'domain': check_setUp(function(t) {
    t.expect(4);
    gb.auth_request.del({
      url: config.host_url + config.base + '/api/apps/' + gb.app_key + '/domains/test1.local',
    }, function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 200, 'invalid statusCode');
      var data;
      t.doesNotThrow(function(){data=JSON.parse(body);}, "could not parse body");
      t.deepEqual(data, {status:'success',data:null}, "api replied an error");
      t.done();
    });
  }),
  'check domains': check_setUp(function(t) {
    t.expect(4);
    gb.auth_request.get(config.host_url + config.base + '/api/apps/' + gb.app_key + '/domains', function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 200, 'invalid statusCode');
      var data;
      t.doesNotThrow(function(){data=JSON.parse(body);}, "could not parse body");
      t.deepEqual(data, {
        status:"success",
        data: ['test2.local']
      }, "api replied an error");
      t.done();
    });
  }),
  'keyset': check_setUp(function(t) {
    t.expect(4);
    gb.auth_request.del({
      url: config.host_url + config.base + '/api/apps/' + gb.app_key + '/keysets/facebook',
    }, function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 200, 'invalid statusCode');
      var data;
      t.doesNotThrow(function(){data=JSON.parse(body);}, "could not parse body");
      t.deepEqual(data, {status:'success',data:null}, "api replied an error");
      t.done();
    });
  }),
  'check app': check_setUp(function(t) {
    t.expect(4);
    gb.auth_request.get(config.host_url + config.base + '/api/apps/' + gb.app_key, function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 200, 'invalid statusCode');
      var data;
      t.doesNotThrow(function(){data=JSON.parse(body);}, "could not parse body");
      t.deepEqual(data, {
        status:"success",
        data: {
          name:"Renamed app",
          key:gb.app_key,
          domains:['test2.local'],
          keysets:[]
        }
      }, "api replied an error");
      t.done();
    });
  }),
  'app': check_setUp(function(t) {
    t.expect(4);
    gb.auth_request.del({
      url: config.host_url + config.base + '/api/apps/' + gb.app_key
    }, function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 200, 'invalid statusCode');
      var data;
      t.doesNotThrow(function(){data=JSON.parse(body);}, "could not parse body");
      t.deepEqual(data, {status:'success',data:null}, "api replied an error");
      t.done();
    });
  }),
  'check app removed': check_setUp(function(t) {
    t.expect(4);
    gb.auth_request.get(config.host_url + config.base + '/api/apps/' + gb.app_key, function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 500, 'invalid statusCode');
      var data;
      t.doesNotThrow(function(){data=JSON.parse(body);}, "could not parse body");
      t.equal(data.status, "error", "api replied an error");
      t.done();
    });
  }),
  'check me': check_setUp(function(t) {
    t.expect(4);
    gb.auth_request.get(config.host_url + config.base + '/api/me', function (error, response, body) {
      t.equal(error, null, 'request error');
      t.equal(response.statusCode, 200, 'invalid statusCode');
      var data;
      t.doesNotThrow(function(){data=JSON.parse(body);}, "could not parse body");
      t.deepEqual(data, {status:'success',data:{apps:[]}}, "api replied an error");
      t.done();
    });
  })
}

exports.cleanup = check_setUp(function(t) {
  t.expect(0);
  gb.db.redis.flushdb(function() {
    t.done();
  });
});
