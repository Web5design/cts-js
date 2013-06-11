CTS.Debugging = {
  DumpStack: function() {
    var e = new Error('dummy');
    var stack = e.stack.replace(/^[^\(]+?[\n$]/gm, '')
        .replace(/^\s+at\s+/gm, '')
        .replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@')
        .split('\n');
    console.log(stack);
  },

  DumpTree: function(node, indent) {
    if (typeof indent == 'undefined') {
      indent = 0;
    }
    var indentSp = "";
    var i;
    for (i = 0; i < indent; i++) {
      indentSp += " ";
    }

    console.log(indentSp + "+ " + node.getValue());

    indentSp += "  ";

    for (i = 0; i < node.relations.length; i++) {
      console.log(indentSp + "- " + node.relations[i].name + " " +
        node.relations[i].opposite(node).getValue());
    }
    for (i = 0; i < node.children.length; i++) {
      CTS.Debugging.DumpTree(node.children[i], indent + 2);
    }
  },

  NodesToString: function(node) {
    var ret = node.getValue();
    if (node.children.length > 0) {
      ret += "(";
      ret += CTS.Fn.map(node.children, function(child) {
        return CTS.Debugging.NodesToString(child);
      }).join(" ");
      ret += ")";
    }
    return ret;
  },

  RenameTree: function(node, dir) {
    if (typeof dir == 'undefined') {
      dir = {};
    }
    
    var v = node.getValue();
    if (typeof dir[v] == 'undefined') {
      dir[v] = 1;
    } else {
      dir[v]++;
      node.setValue(v + dir[v]);
    }

    for (var i = 0; i < node.children.length; i++) {
      CTS.Debugging.RenameTree(node.children[i], dir);
    }
    return node;
  },

  // NODES := <null> | NODE | NODE NODES
  // NODE := NODE_WO_KIDS | NODE_W_KIDS
  // NODE_WO_KIDS := name
  // NDOE_W_KIDS := name(NODES)
  StringToNodes: function(str) {
    var ret = [];
    var name, parens, firstParen, secondParen;

    var reset = function() {
      name = "";
      parens = 0;
      firstParen = -1;
      secondParen = -1;
    };

    var pop = function() {
      var n = new CTS.AbstractNode();
      n.setValue(name);
      if (firstParen != -1) {
        // Handle innards.
        var substr = str.substring(firstParen + 1, secondParen);
        CTS.Fn.each(CTS.Debugging.StringToNodes(substr), function(c) {
          n.insertChild(c);
        });
      }
      ret.push(n);
    };

    reset();

    var i = 0;
    while (i < str.length) {
      var c = str[i++];
      if (c == '(') {
        if (firstParen == -1) {
          firstParen = i - 1;
        }
        parens++;
      } else if (c == ')') {
        secondParen = i - 1;
        parens--;
        if (parens == 0) {
          pop();
          reset();
        }
      } else if ((c == ' ') && (parens == 0)) {
        pop();
        reset();
      } else {
        if (firstParen == -1) {
          name += c;
        }
      }
    }
    if (name != "") {
      var n = new CTS.AbstractNode();
      n.setValue(name);
      ret.push(n);
    }
    return ret;
  },

  StringsToRelations: function(root1, root2, strs) {
    return CTS.Fn.map(strs.split(";"), function(str) {
      var parts = str.split(" ");
      var v1 = parts[0];
      var p  = parts[1];
      var v2 = parts[2];
      var n1 = CTS.Debugging.NodeWithValue(root1, v1);
      var n2 = CTS.Debugging.NodeWithValue(root2, v2);
      var r = null;
      if (p == "is") {
        r = new CTS.Relation.Is(n1, n2);
      } else if (p == "if-exist") {
        r = new CTS.Relation.IfExist(n1, n2);
      } else if (p == "if-nexist") {
        r = new CTS.Relation.IfNexist(n1, n2);
      } else if (p == "are") {
        r = new CTS.Relation.Are(n1, n2);
      }
      return r;
    });
  },

  NodeWithValue: function(root, value) {
    if (root.getValue() == value) {
      return root;
    } else {
      for (var i = 0; i < root.children.length; i++) {
        var ret = CTS.Debugging.NodeWithValue(root.children[i], value);
        if (ret != null) {
          return ret;
        }
      }
    }
    return null;
  },

  QuickCombine: function(treeStr1, treeStr2, rules, ruleToRun) {
    var n1 = CTS.Debugging.StringToNodes(treeStr1)[0];
    var n2 = CTS.Debugging.StringToNodes(treeStr2)[0];
    var rs = CTS.Debugging.StringsToRelations(n1, n2, rules);
    if (typeof ruleToRun == 'undefined') {
      for (var i = 0; i < rs.length; i++) {
        rs[i].execute(rs[i].node1);
      }
    } else {
      var r2 = CTS.Debugging.StringsToRelations(n1, n2, ruleToRun);
      for (var i = 0; i < r2.length; i++) {
        r2[i].execute(r2[i].node1);
      }
    }
    return n1;
  },

  RuleStringForTree: function(node) {
    var ret = [];
    var i;

    for (i = 0; i < node.relations.length; i++) {
      // XXX(eob): Note: ordering is random! Testers take note!
      var r = node.relations[i];
      var rstr = r.node1.getValue() + " "
               + r.name + " " 
               + r.node2.getValue();
      ret.push(rstr);
    }

    for (var i = 0; i < node.children.length; i++) {
      ret.push(CTS.Debugging.RuleStringForTree(node.children[i]));
    }

    return ret.join(";");
  },

  TreeTest: function(treeStr1, treeStr2, rules, rulesToRun) {
    var n = CTS.Debugging.QuickCombine(treeStr1, treeStr2, rules, rulesToRun);
    return CTS.Debugging.NodesToString(CTS.Debugging.RenameTree(n));
  },

  RuleTest: function(treeStr1, treeStr2, rules, rulesToRun) {
    var n = CTS.Debugging.QuickCombine(treeStr1, treeStr2, rules, rulesToRun);
    var n2 = CTS.Debugging.RenameTree(n);
    CTS.Debugging.DumpTree(n2);
    return CTS.Debugging.RuleStringForTree(n2);
  }

};
