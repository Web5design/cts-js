// Forrest
// ==========================================================================
// A Forrest contains:
//  * Named trees
//  * Relations between those trees
// ==========================================================================

// Constructor
// -----------
var Forrest = CTS.Forrest = function(opts) {
  this.forrestSpecs = [];

  this.treeSpecs = {};
  this.trees = {};
  
  this.relationSpecs = [];
  this.relations= [];

  this.insertionListeners = {};

  this.opts = opts || {};
  this.initialize();
};

// Instance Methods
// ----------------
CTS.Fn.extend(Forrest.prototype, {

  /*
   * Initialization Bits
   *
   * -------------------------------------------------------- */

  initialize: function() {
    this.addAndRealizeDefaultTrees();
  },

  addAndRealizeDefaultTrees: function() {
    var self = this;
    var pageBody = null;
    if (typeof this.opts.defaultTree != 'undefined') {
      var pageBody = new CTS.Tree.Spec('HTML', 'body', this.opts.defaultTree);
    } else {
      var pageBody = new CTS.Tree.Spec('HTML', 'body', null);
    }
    this.addTreeSpec(pageBody);
    this.realizeTree(pageBody).then(
     function(tree) {
       // Default tree was realized.
       // Add callback for DOM change events.
       var listener = function(evt) {
         self._onDomNodeInserted(tree, CTS.$(evt.target), evt);
       };
       self.insertionListeners[tree.name] = listener;
       // jQuery Listener syntax.
       tree.root.on("DOMNodeInserted", listener);

       // NOW CTS IS READY AND LOADED
       CTS.status._defaultTreeReady.resolve();
     },
     function() {
       // Default tree was not realized
     }
    );
  },

  stopListening: function() {
    for (var i = 0; i < this.insertionListeners.lenth; i++) {
      tree.root.off("DOMNodeInserted", this.insertionListeners[i]);
    }
  },

  // Removes all dependency specs from the root tree
  removeDependencies: function() {
    for (var j = 0; j < this.forrestSpecs.length; j++) {
      for (var i = 0; i < this.forrestSpecs[j].dependencySpecs.length; i++) {
        var ds = this.forrestSpecs[j].dependencySpecs[i];
        ds.unload();
      }
    }
  },

  /*
   * Adding Specs
   *
   * A forrest is built by adding SPECS (from the language/ package) to it
   * rather than actual objects. These specs are lazily instantiated into
   * model objects as they are needed.  Thus, the addTree method takes a
   * TreeSpec, rather than a Tree, and so on.
   *
   * -------------------------------------------------------- */
  addSpec: function(forrestSpec) {
    var self = this;
    this.forrestSpecs.push(forrestSpec);

    var initial = Q.defer();
    var last = initial.promise;

    var i, j;

    // Load all the relation specs
    for (j = 0; j < forrestSpec.relationSpecs.length; j++) {
      self.addRelationSpec(spec);
    }
    // Load all the dependency specs
    for (dep in forrestSpec.dependencySpecs) {
      forrestSpec.dependencySpecs[dep].load();
    }

    // Load AND REALIZE all the tree specs
    for (i = 0; i < forrestSpec.treeSpecs.length; i++) {
      (function(treeSpec) {
        var treeSpec = forrestSpec.treeSpecs[i];
        self.addTreeSpec(treeSpec);
        var next = Q.defer();
        last.then(function() {
          var promise = self.realizeTree(treeSpec);
          promise.then(function() {next.resolve()});
        });
        last = next.promise;
      })(forrestSpec.treeSpecs[i])
    }

    initial.resolve();
    return last;
  },

  addTreeSpec: function(treeSpec) {
    this.treeSpecs[treeSpec.name] = treeSpec;
  },

  addRelationSpec: function(relationSpec) {
    this.relationSpecs.push(relationSpec);
  },

  addRelationSpecs: function(someRelationSpecs) {
    for (var i = 0; i < someRelationSpecs.length; i++) {
      // Faster than .push()
      this.relationSpecs.push(someRelationSpecs[i]);
    }
  },

  realizeTrees: function() {
    var promises = [];
    Fn.each(this.treeSpecs, function(treeSpec, name, list) {
      if (! Fn.has(this.trees, name)) {
        promises.push(this.realizeTree(treeSpec));
      }
    }, this);
    return Q.all(promises);
  },

  realizeDependencies: function() {
    Fn.each(this.forrestSpecs, function(fs) {
      Fn.each(fs.dependencySpecs, function(ds) {
        ds.load();
      });
    });
  },

  realizeTree: function(treeSpec) {
    var deferred = Q.defer();
    var self = this;
    if ((treeSpec.url !== null) && (treeSpec.url.indexOf("alias(") == 0) && (treeSpec.url[treeSpec.url.length - 1] == ")")) {
      var alias = treeSpec.url.substring(6, treeSpec.url.length - 1);
      if (typeof self.trees[alias] != 'undefined') {
        self.trees[treeSpec.name] = self.trees[alias];
        deferred.resolve(self.trees[alias]);
      } else {
        deferred.reject("Trying to alias undefined tree");
      }
    } else if (typeof treeSpec.url == "string") {
      treeSpec.url = CTS.Utilities.fixRelativeUrl(treeSpec.url, treeSpec.loadedFrom);
      CTS.Tree.Create(treeSpec, this).then(
        function(tree) {
          self.trees[treeSpec.name] = tree;
          deferred.resolve(tree);
        },
        function(reason) {
          deferred.reject(reason);
        }
      );
    } else {
      // it's a jquery node
      CTS.Tree.Create(treeSpec, this).then(
        function(tree) {
          self.trees[treeSpec.name] = tree;
          deferred.resolve(tree);
        },
        function(reason) {
          deferred.reject(reason);
        }
      );
    }
    return deferred.promise;
  },

  realizeRelations: function() {
    for (var i = 0; i < this.relationSpecs.length; i++) {
      this.realizeRelation(this.relationSpecs[i]);
    }
  },

  /* The JSON should be of the form:
   * 1. [
   * 2.   ["TreeName", "SelectorName", {"selector1-prop":"selector1-val"}]
   * 3.   ["Relation",  {"prop":"selector1-val"}]
   * 4.   ["TreeName", "SelectorName", {"selector2-prop":"selector1-val"}]
   * 5. ]
   *
   * The outer array (lines 1 and 5) are optional if you only have a single rule.
   *
   */
  incorporateInlineJson: function(json, node) {
    if (json.length == 0) {
      return [];
    }
    if (! CTS.Fn.isArray(json[0])) {
      json = [json];
    }
    var ret = [];
    for (var i = 0; i < json.length; i++) {
      var s1 = CTS.Parser.Json.parseSelectorSpec(json[i][0], node);
      var s2 = CTS.Parser.Json.parseSelectorSpec(json[i][2], node);
      var rule = CTS.Parser.Json.parseRelationSpec(json[i][1], s1, s2);
      this.relationSpecs.push(rule);
      ret.push(rule);
    }
    return ret;
  },

  realizeRelation: function(spec) {
    var s1 = spec.selectionSpec1;
    var s2 = spec.selectionSpec2;

    // Realizing a relation spec has a dependency on the realization of
    // the realization of the treespecs.
    // TODO(eob): One day, having a nice dependency DAG would be nice.
    // For now, we'll error if deps aren't met.
    if (! (this.containsTree(s1.treeName) && this.containsTree(s2.treeName))) {
      if (! this.containsTree(s1.treeName)) {
        CTS.Log.Error("Can not realize RelationSpec becasue one or more trees are not available", s1.treeName);
      }
      if (! this.containsTree(s2.treeName)) {
        CTS.Log.Error("Can not realize RelationSpec becasue one or more trees are not available", s2.treeName);
      }
      return;
    }

    // Here we're guaranteed that the trees are available.

    // Now we find all the nodes that this spec matches on each side and
    // take the cross product of all combinations.

    var nodes1 = this.trees[s1.treeName].nodesForSelectionSpec(s1);
    var nodes2 = this.trees[s2.treeName].nodesForSelectionSpec(s2);

    for (var i = 0; i < nodes1.length; i++) {
      for (var j = 0; j < nodes2.length; j++) {
        // Realize a relation between i and j. Creating the relation adds
        // a pointer back to the nodes.
        var relation = new CTS.Relation.CreateFromSpec(nodes1[i], nodes2[j], spec);
        // Add the relation to the forrest
        this.relations.push(relation);
      }
    }
  },

  /*
   * Fetching Objects
   *
   * -------------------------------------------------------- */

  containsTree: function(alias) {
    return CTS.Fn.has(this.trees, alias);
  },

  getTree: function(alias) {
    return this.trees[alias];
  },

  getPrimaryTree: function() {
    return this.trees.body;
  },

  /*
   * Event Handlers
   *
   * -------------------------------------------------------- */
  _onDomNodeInserted: function(tree, node, evt) {
    // If the tree is the main tree, we want to possibly run any CTS
    if (typeof evt.ctsHandled == 'undefined') {
      var ctsNode = tree.getCtsNode(node);
      if (ctsNode == null) {
        // Get the parent
        var p = CTS.$(CTS.$(node).parent());
        var ctsParent = tree.getCtsNode(p);
        if (ctsParent == null) {
          CTS.Log.Error("Node inserted into yet unmapped region of tree", p);
        } else {
          // Create the CTS tree for this region.
          var ctsNode = ctsParent._onChildInserted(node);
          //  Now run any rules.
          ctsNode._processIncoming();
        }
      }
      evt.ctsHandled = true;
    }
  }

});
