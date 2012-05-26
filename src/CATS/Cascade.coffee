# Copyright (c) 2012 Edward Benson
#
# Permission is hereby granted, free of charge, to any person obtaining
# a copy of this software and associated documentation files (the
# "Software"), to deal in the Software without restriction, including
# without limitation the rights to use, copy, modify, merge, publish,
# distribute, sublicense, and/or sell copies of the Software, and to
# permit persons to whom the Software is furnished to do so, subject to
# the following conditions:
#
# The above copyright notice and this permission notice shall be
# included in all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
# EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
# MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
# NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
# LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
# OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
# WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Context
# Author: Ted Benson <eob@csail.mit.edu>

#### Preamble
$ = jQueryHcss

#### Cascade
# TODO: This doesn't implement the cascade correctly
class Cascade
  @.blocks = {}

  @attachSheet: (str) ->
    blks = CATS.Parser.parseBlocks(str)
    # TODO: This will blow over old keys
    # Need to fix
    console.log(Cascade.blocks)
    $.extend(Cascade.blocks, blks)
    console.log(Cascade.blocks)

  @sheetRulesForNode: (node) ->
    ret = {}
    hit = false
    for key of Cascade.blocks
      if node.is(key)
        hit = true
        $.extend(ret,Cascade.blocks[key])
    if not hit
      return null
    ret

  @inlineRulesForNode: (node) ->
    ret = {}
    hadSpecific = no
    if node.data?
      data = node.data()
      if typeof data != "undefined"
        block = node.data()["bind"]
        if typeof block != "undefined"
          hadSpecific = yes
          parsed = CATS.Parser.parseBlock(block)
          ret = $.extend(ret, parsed)
    if hadSpecific
      return ret
    else
      return null

  @rulesForNode: (node) ->
    sheetRules = Cascade.sheetRulesForNode(node)
    inlineRules = Cascade.inlineRulesForNode(node)
    if sheetRules == null and inlineRules == null
      return null
    rules = {}
    if sheetRules != null
      $.extend(rules,sheetRules)
    if inlineRules != null
      $.extend(rules,inlineRules)
    rules
