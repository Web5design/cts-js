// Node
// --------------------------------------------------------------------------
// 
// A Node represents a fragment of a tree which is annotated with CTS.
//
// Nodes are responsible for understanding how to behave when acted on
// by certain relations (in both directions). The differences between
// different types of trees (JSON, HTML, etc) are concealed at this level.

CTS.Node = {

  initializeNodeBase: function(tree, opts) {
    this.opts = opts;
    this.tree = tree;
    this.kind = null;
    this.children = [];
    this.parentNode = null;
    this.relations = [];
    this.value = null;
    this.addedMyInlineRelationsToForrest = false;
    this.initializeStateMachine();
  },

  getChildren: function() {
    return this.children;
  },

  registerRelation: function(relation) {
    if (! CTS.Fn.contains(this.relations, relation)) {
      this.relations.push(relation);
    }
  },

  unregisterRelation: function(relation) {
    this.relations = CTS.Fn.filter(this.relations,
        function(r) { return r != relation; });
  },

  getRelations: function() {
    if (! this.addedMyInlineRelationsToForrest) {
      this.registerInlineRelationSpecs();
    }
    return this.relations;
  },

  getInlineRelationSpecs: function() {
    return _subclass_getInlineRelationSpecs();
  },

  registerInlineRelationSpecs: function() {
    if (this.addedMyInlineRelationsToForrest) {
      CTS.Log.Warn("Not registering inline relations: have already done so.");
    } else {
      if ((typeof this.tree != 'undefined') && (typeof this.tree.forrest != 'undefined')) {
        CTS.Fn.Each(this.getInlineRelationSpecs(), function(spec) {
          this.tree.forrest.addRelationSpec(spec);
          this.tree.forrest.realizeRelationSpec(spec);
        }, this);
        this.addedMyInlineRelationsToForrest = true;
      } else {
        CTS.Log.Warn("Could not add inline relations to null tree.forrest");
      }
    }
  },

  getSubtreeRelations: function() {
    return CTS.Fn.union(this.getRelations(), CTS.Fn.flatten(
      CTS.Fn.map(this.getChildren(), function(kid) {
        return kid.getSubtreeRelations();
      }))
    );
  },
  
  insertChild: function(node, afterIndex) {
    if (typeof afterIndex == 'undefined') {
      afterIndex = this.children.length - 1;
    }

    this.children[this.children.length] = null;
    for (var i = this.children.length - 1; i > afterIndex; i--) {
      if (i == (afterIndex + 1)) {
        this.children[i] = node;
      } else {
        this.children[i] = this.children[i - 1];
      }
    }

    node.parentNode = this;

    //TODO(eob) Have this be an event
    this._subclass_insertChild(node, afterIndex);
  },

  destroy: function() {
    if (this.parentNode) {
      var gotIt = false;
      for (var i = 0; i < this.parentNode.children.length; i++) {
        if (this.parentNode.children[i] == this) {
          CTS.Fn.arrDelete(this.parentNode.children, i, i);
          gotIt = true;
          break;
        }
      }
    }
    if (! gotIt) {
      CTS.Log.Error("Destroying child whose parent doesn't know about it.");
    }
    this._subclass_destroy();
  },

  undestroy: function() {
  },

  realizeChildren: function() {
    if (this.children.length != 0) {
      CTS.Log.Fatal("Trying to realize children when already have some.");
    }
    this._subclass_realizeChildren();
    CTS.Fn.each(this.children, function(child) {
      child.realizeChildren();
    });
  },

  clone: function() {
    var c = this._subclass_beginClone();

    // Note: because the subclass constructs it's own subtree,
    // that means it is also responsible for cloning downstream nodes.
    // thus we only take care of THIS NODE's relations.
    for (var i = 0; i < this.relations.length; i++) {
      var n1 = this.relations[i].node1;
      var n2 = this.relations[i].node2;
      if (n1 == this) {
        n1 = c;
      } else if (n2 == this) {
        n2 = c;
      } else {
        CTS.Fatal("Clone failed");
      }
      var relationClone = this.relations[i].clone(n1, n2);
    };
    // Note that we DON'T wire up any parent-child relationships
    // because that would result in more than just cloning the node
    // but also modifying other structures, such as the tree which
    // contained the source.
    return c;
  },

  /************************************************************************
   **
   ** Methods to be overridden by subclasses
   **
   ************************************************************************/

  getValue: function(opts) {
    return this.value;
  },

  setValue: function(v, opts) {
    this.value = v;
  },

  descendantOf: function(other) {
    return false;
  },

  _subclass_realizeChildren: function() {},
  _subclass_insertChild: function(child, afterIndex) {},
  _subclass_destroy: function() {},
  _subclass_getInlineRelations: function() {},
  _subclass_beginClone: function() {}

};
