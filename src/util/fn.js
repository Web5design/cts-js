/*
 * Helper functions. Many of these are taken from Underscore.js
 */
var Fn = CTS.Fn = {

  each: function(obj, iterator, context) {
    if (obj == null) return;
    if (Array.prototype.forEach && obj.forEach === Array.prototype.forEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (CTS.Fn.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  },

  map: function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (Array.prototype.map && obj.map === Array.prototype.map) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    return results;
  },

  extend: function(obj) {
    each(Array.prototype.slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  },

  isUndefined: function(obj) {
  },
  
  isObject: function(obj) {
    return obj === Object(obj);
  },

  isUndefined: function(obj) {
    return obj === void 0;
  },
  
  has: function(obj, key) {
    return hasOwnProperty.call(obj, key);
  },

  contains: function(obj, target) {
    if (obj == null) return false;
    if (Array.prototype.indexOf && obj.indexOf === Array.prototype.indexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  },

  once: function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  },

  uniqueId: function(prefix) {
    var id = ++CTS.Fn.idCounter + '';
    return prefix ? prefix + id : id;
  },

  union: function() {
    return CTS.Fn.uniq(concat.apply(Array.prototype, arguments));
  };

  unique: function(array, isSorted, iterator, context) {
    if (CTS.Fn.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? CTS.Fn.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !CTS.Fn.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  },
  
  without: function(array) {
    return CTS.Fn.difference(array, slice.call(arguments, 1));
  },

  difference: function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return CTS.Fn.filter(array, function(value){ return !CTS.Fn.contains(rest, value); });
  },

  filter: function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (Array.prototype.filter && obj.filter === Array.prototype.filter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  },

  flattenWithOutput: function(input, shallow, output) {
    each(input, function(value) {
      if (CTS.Fn.isArray(value)) {
        shallow ? push.apply(output, value) : flattenWithOutput(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  },

  flatten: function(array, shallow) {
    return flattenWithOutput(array, shallow, []);
  }
};

CTS.Fn.isArray = Array.isArray || function(obj) {
  return toString.call(obj) == '[object Array]';
};

CTS.Fn.keys = Object.keys || function(obj) {
  if (obj !== Object(obj)) throw new TypeError('Invalid object');
  var keys = [];
  for (var key in obj) if (CTS.Fn.has(obj, key)) keys[keys.length] = key;
  return keys;
};

CTS.Fn.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
  CTS.Fn.['is' + name] = function(obj) {
    return toString.call(obj) == '[object ' + name + ']';
  };
});

if (typeof (/./) !== 'function') {
  CTS.Fn.isFunction = function(obj) {
    return typeof obj === 'function';
  };
}

CTS.Fn.idCounter = 0;
