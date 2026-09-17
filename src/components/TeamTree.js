import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { COLORS } from '../theme';

// Build tree from flat array
function buildTree(team) {
  const root = {
    id: 'macho',
    name: 'Macho',
    initials: 'MA',
    status: 'Sr. Manager',
    type: 'self',
    pv: 0,
    children: [],
  };
  if (!team || team.length === 0) return root;

  // Direct legs are children of root
  const directs = team.filter(m => m.direct);
  const indirects = team.filter(m => !m.direct);

  function getChildren(parentId) {
    return indirects.filter(m => m.sponsorId === parentId);
  }

  function buildNode(member) {
    const kids = getChildren(member.id);
    return {
      id: member.id,
      name: member.name,
      initials: getInitials(member.name),
      status: member.status || 'Newbie',
      type: member.direct ? 'direct' : 'indirect',
      pv: member.pv || 0,
      phone: member.phone,
      joined: member.joined,
      earningStage: member.earningStage,
      children: kids.map(k => buildNode(k)),
    };
  }

  root.children = directs.map(d => buildNode(d));
  return root;
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.replace(/^(Mr|Mrs|Miss|Ms)\.?\s*/i, '').trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].substring(0, 2).toUpperCase();
}

const STATUS_COLORS = {
  'Newbie': COLORS.t3,
  'Pro': COLORS.blue,
  'Distributor': COLORS.primary,
  'Manager': COLORS.accent,
  'Sr. Manager': COLORS.warn,
  'Exec. Manager': COLORS.danger,
  'Director': COLORS.warn,
};

function countAll(node) {
  if (!node.children || node.children.length === 0) return 0;
  let c = node.children.length;
  node.children.forEach(k => { c += countAll(k); });
  return c;
}

// Single circular node
function NodeCircle({ node, isRoot, onPress }) {
  const color = STATUS_COLORS[node.status] || COLORS.t3;
  const total = countAll(node);

  return (
    <TouchableOpacity onPress={() => onPress(node)} activeOpacity={0.7} style={st.nodeWrap}>
      <View style={[
        st.circle,
        isRoot ? st.circleLeader : { borderColor: color, borderWidth: 2.5 },
      ]}>
        <Text style={[st.circleText, isRoot && { fontSize: 18 }]}>{node.initials}</Text>
        {total > 0 && (
          <View style={st.badge}>
            <Text style={st.badgeText}>{total}</Text>
          </View>
        )}
      </View>
      <Text style={st.nodeName} numberOfLines={1}>{node.name}</Text>
      <Text style={st.nodeStatus}>{node.status}</Text>
      {!isRoot && (
        <View style={[st.tag, node.type === 'direct' ? st.tagDirect : st.tagIndirect]}>
          <Text style={[st.tagText, { color: node.type === 'direct' ? COLORS.primary : COLORS.accent }]}>
            {node.type === 'direct' ? 'Direct' : 'Indirect'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// Recursive tree node — renders a node + vertical line + children row
function TreeNode({ node, isRoot, onPress }) {
  const hasChildren = node.children && node.children.length > 0;
  const [expanded, setExpanded] = useState(true);

  return (
    <View style={st.branchWrap}>
      {/* The node itself */}
      <NodeCircle node={node} isRoot={isRoot} onPress={onPress} />

      {/* Expand toggle */}
      {hasChildren && (
        <TouchableOpacity
          onPress={() => setExpanded(!expanded)}
          style={st.expandBtn}
          activeOpacity={0.7}
        >
          <Text style={st.expandText}>{expanded ? '▾' : '▸'}</Text>
        </TouchableOpacity>
      )}

      {/* Children */}
      {hasChildren && expanded && (
        <View style={st.childrenWrap}>
          {/* Vertical line from parent down to junction */}
          <View style={st.lineDown} />

          {/* Horizontal bar + vertical drops */}
          {node.children.length > 1 && (
            <View style={st.junctionWrap}>
              <View style={st.lineHorizontal} />
            </View>
          )}

          {/* Children row */}
          <View style={st.childrenRow}>
            {node.children.map((child, i) => (
              <View key={child.id} style={st.childCol}>
                {/* Vertical drop line from horizontal bar to child */}
                <View style={st.lineDrop} />
                <TreeNode node={child} isRoot={false} onPress={onPress} />
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// Detail bottom sheet
function DetailSheet({ node, onClose }) {
  if (!node) return null;
  const color = STATUS_COLORS[node.status] || COLORS.t3;
  const total = countAll(node);

  return (
    <TouchableOpacity activeOpacity={1} onPress={onClose} style={st.overlay}>
      <TouchableOpacity activeOpacity={1} style={st.sheet}>
        <View style={st.handle} />
        <View style={st.detailHeader}>
          <View style={[st.detailCircle, { borderColor: color }]}>
            <Text style={st.detailInitials}>{node.initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.detailName}>{node.name}</Text>
            <Text style={st.detailMeta}>
              {node.type === 'direct' ? 'Direct Leg' : node.type === 'indirect' ? 'Indirect' : 'You'}
              {' · '}{node.status}
            </Text>
          </View>
        </View>
        <View style={st.detailGrid}>
          <View style={st.detailCard}>
            <Text style={st.detailLabel}>Status</Text>
            <Text style={[st.detailValue, { color: COLORS.primary }]}>{node.status}</Text>
          </View>
          <View style={st.detailCard}>
            <Text style={st.detailLabel}>PV This Month</Text>
            <Text style={[st.detailValue, { color: COLORS.accent }]}>{node.pv}</Text>
          </View>
          <View style={st.detailCard}>
            <Text style={st.detailLabel}>Downlines</Text>
            <Text style={[st.detailValue, { color: COLORS.warn }]}>{total}</Text>
          </View>
          <View style={st.detailCard}>
            <Text style={st.detailLabel}>Joined</Text>
            <Text style={st.detailValue}>{node.joined || '—'}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// Main export
export default function TeamTree({ team, qpv, tierRank, onMemberPress }) {
  const [selectedNode, setSelectedNode] = useState(null);
  const tree = buildTree(team);
  tree.pv = qpv || 0;

  const handlePress = (node) => {
    if (node.id === 'macho') return;
    if (onMemberPress) {
      onMemberPress(node.id);
    } else {
      setSelectedNode(node);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={st.scrollH}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={st.scrollV}
        >
          <TreeNode node={tree} isRoot={true} onPress={handlePress} />
        </ScrollView>
      </ScrollView>

      {selectedNode && (
        <DetailSheet node={selectedNode} onClose={() => setSelectedNode(null)} />
      )}
    </View>
  );
}

// Also export the builder for external use
export { buildTree };

const LINE_COLOR = 'rgba(0, 212, 170, 0.25)';
const LINE_WIDTH = 2;

const st = StyleSheet.create({
  // Layout
  branchWrap: {
    alignItems: 'center',
  },
  childrenWrap: {
    alignItems: 'center',
  },
  childrenRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  childCol: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  scrollH: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  scrollV: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 80,
  },

  // Connector lines
  lineDown: {
    width: LINE_WIDTH,
    height: 24,
    backgroundColor: LINE_COLOR,
  },
  junctionWrap: {
    width: '100%',
    alignItems: 'center',
    position: 'relative',
  },
  lineHorizontal: {
    height: LINE_WIDTH,
    backgroundColor: LINE_COLOR,
    alignSelf: 'stretch',
    marginHorizontal: '25%',
  },
  lineDrop: {
    width: LINE_WIDTH,
    height: 20,
    backgroundColor: LINE_COLOR,
  },

  // Node
  nodeWrap: {
    alignItems: 'center',
    paddingBottom: 2,
  },
  circle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleLeader: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.bg,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  circleText: {
    color: COLORS.t1,
    fontSize: 16,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.bg,
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  nodeName: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.t1,
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 72,
  },
  nodeStatus: {
    fontSize: 8,
    color: COLORS.t3,
    marginTop: 1,
  },
  tag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    marginTop: 2,
  },
  tagDirect: {
    backgroundColor: COLORS.primaryDim,
  },
  tagIndirect: {
    backgroundColor: COLORS.accentDim,
  },
  tagText: {
    fontSize: 7,
    fontWeight: '600',
  },
  expandBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginBottom: 2,
  },
  expandText: {
    color: COLORS.t2,
    fontSize: 11,
  },

  // Detail sheet
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 18,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
  },
  detailCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.card,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailInitials: {
    color: COLORS.t1,
    fontSize: 18,
    fontWeight: '700',
  },
  detailName: {
    color: COLORS.t1,
    fontSize: 16,
    fontWeight: '700',
  },
  detailMeta: {
    color: COLORS.t2,
    fontSize: 11,
    marginTop: 2,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  detailCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailLabel: {
    fontSize: 9,
    color: COLORS.t3,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.t1,
  },
});
