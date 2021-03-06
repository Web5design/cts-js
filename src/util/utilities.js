CTS.Fn.extend(CTS.Utilities, {

  getUrlBase: function(url) {
    var temp = document.createElement('a');
    temp.href = url;

    var base = temp.protocol + "//" + temp.hostname;
    if (temp.port) {
      base += ":" + temp.port;
    }
    return base;
  },

  getUrlBaseAndPath: function(url) {
    var temp = document.createElement('a');
    temp.href = url;

    var base = temp.protocol + "//" + temp.hostname;
    if (temp.port) {
      base += ":" + temp.port;
    }
    var parts = temp.pathname.split("/");
    if (parts.length > 0) {
      parts.pop(); // The filename
    }
    var newPath = parts.join("/");
    if (newPath.length == 0) {
      newPath = "/";
    }
    base += newPath;
    return base;
  },


  rewriteRelativeLinks: function(jqNode, sourceUrl) {
    var base = CTS.Utilities.getUrlBase(sourceUrl);
    var basePath = CTS.Utilities.getUrlBaseAndPath(sourceUrl);
    var pat = /^https?:\/\//i;
    var fixElemAttr = function(elem, attr) {
      var a = elem.attr(attr);
      if ((typeof a != 'undefined') && 
          (a !== null) &&
          (a.length > 0)) {
        if (! pat.test(a)) {
          if (a[0] == "/") {
            a = base + a;
          } else {
            a = basePath + "/" + a;
          }
          elem.attr(attr, a); 
        }
      }
    };
    var fixElem = function(elem) {
      if (elem.is('img')) {
        fixElemAttr(elem, 'src');
      } else if (elem.is('a')) {
        fixElemAttr(elem, 'href');
      } else {
        // Do nothing
      }
      Fn.each(elem.children(), function(c) {
        fixElem(CTS.$(c));
      }, this);
    }
    fixElem(jqNode);
  },

  /**
   * Returns array of objects with keys:
   *  type: (link or inline)
   *  content: the cts content for inline
   *  url: the url for links
   *  args: any other args
   *
   * TODO(eob): Provide a root element as optional argument
   * to support ingestion of cts rules from transcluded content.
   */ 
  getTreesheetLinks: function() {
    var ret = [];
    CTS.Fn.each(CTS.$('script[data-treesheet]'), function(elem) {
      var str = CTS.$(elem).attr('data-treesheet');
      if (str != null) {
        var urls = str.split(";");
        for (var i = 0; i < urls.length; i++) {
          var block = {
            type: 'link',
            format: 'string',
            url: urls[i]
          };
          ret.push(block);
        }
      }
    }, this);
    CTS.Fn.each(CTS.$('script[data-theme]'), function(elem) {
      var str = CTS.$(elem).attr('data-theme');
      var sub = CTS.$(elem).attr('data-subtheme');
      if (str != null) {
        var urls = CTS.Utilities.themeUrls(str, sub);
        for (var k = 0; k < urls.length; k++) {
          var block = {
            type: 'link',
            format: 'string',
            url: urls[k]
          };
          ret.push(block);
        }
      }
    }, this);

    CTS.Fn.each(CTS.$('style[type="text/cts"]'), function(elem) {
      var block = {
        type: 'block',
        format: 'string',
        content: CTS.$(elem).html()
      };
      ret.push(block);
    }, this);
    CTS.Fn.each(CTS.$('style[type="json/cts"]'), function(elem) {
      var block = {
        type: 'block',
        format: 'json',
        content: CTS.$(elem).html()
      };
      ret.push(block);
    }, this);
    // TODO(eob): see if this causes it to get the smae element three times...
    // XXX !important
    CTS.Fn.each(CTS.$('link[rel="treesheet"],link[type="txt/cts"],link[type="json/cts"]'), function(elem) {
      var e = CTS.$(elem);
      var type = e.attr('type');
      var format = 'string';
      if (type == 'json/cts') {
        format = 'json';
      }
      var block = {
        type: 'link',
        url: CTS.$(elem).attr('href'),
        format: format
      };
      ret.push(block);
    }, this);
    return ret;
  },

  themeUrls: function(themeRef, subthemeRef) {
    // theme urls take the form TYPE/INSTANCE/PAGE 
    // TODO(eob): create more flexible ecosystem

    var parts = themeRef.split("/");
    var kind = null;
    var name = null;
    var page = null;

    if (parts.length == 2) {
      kind = parts[0];
      name = parts[1];
    }

    if (parts.length == 3) {
      kind = parts[0];
      name = parts[1];
      page = parts[2];
    }

    if ((typeof subthemeRef != 'undefined') && (subthemeRef !== null)) {
      page = subthemeRef;
    }

    if (page == null) {
      return "http://treesheets.csail.mit.edu/mockups/" + kind + "/" + name + "/" + name + ".cts"
    } else {
      return [
        "http://treesheets.csail.mit.edu/mockups/" + kind + "/" + page + ".cts",
        "http://treesheets.csail.mit.edu/mockups/" + kind + "/" + name + "/" + page + ".cts"
      ];
    }
  },

  fixRelativeUrl: function(url, loadedFrom) {
    if ((url === null) || (typeof url == "undefined")) {
      return null;
    }
    if (typeof loadedFrom == 'undefined') {
      return url;
    } else {
      if ((url.indexOf("relative(") == 0) && (url[url.length - 1] == ")")) {
        var fragment = url.substring(9, url.length - 1);
        var prefix = loadedFrom.split("/");
        prefix.pop();
        prefix = prefix.join("/");
        url = prefix + "/" + fragment;
        return url;
      } else {
        return url;
      }
    }
  },

  fetchString: function(params) {
    var deferred = Q.defer();
    var xhr = CTS.$.ajax({
      url: params.url,
      dataType: 'text',
      beforeSend: function(xhr, settings) {
        CTS.Fn.each(params, function(value, key, list) {
          xhr[key] = value;
        }, this);
      }
    });
    xhr.done(function(data, textStatus, jqXhr) {
      deferred.resolve(data, textStatus, jqXhr);
    });
    xhr.fail(function(jqXhr, textStatus, errorThrown) {
      CTS.Log.Error("Couldn't fetch string at:", params.url);
      deferred.reject(jqXhr, textStatus, errorThrown);
    });
    return deferred.promise;
  },

  fetchTree: function(spec, callback, context) {
    if ((spec.url == null) && (spec.name == 'body')) {
      callback.call(context, null, CTS.$('body'));
    } else {
      CTS.Log.Fatal("FETCH TREE NOT IMPLEMENTED");
      callback.call(context, "Not Implemented");
    }
  }

});
