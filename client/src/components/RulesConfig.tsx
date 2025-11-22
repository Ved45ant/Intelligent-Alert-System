import React from 'react';

interface RulesConfigProps {
  rules: Record<string, any>;
  onReload: () => void;
  canReload: boolean;
}

export default function RulesConfig({ rules, onReload, canReload }: RulesConfigProps) {
  return (
    <div>
      <div className="row" style={{ justifyContent:'space-between', alignItems:'center' }}>
        <h4 style={{ margin:'4px 0' }}>Active Rules</h4>
        {canReload && <button className="btn small" onClick={onReload}>Reload Rules</button>}
      </div>
      <pre style={{ maxHeight:160, overflow:'auto', background:'#fafafa', padding:8, border:'1px solid #eee' }}>{JSON.stringify(rules, null, 2)}</pre>
    </div>
  );
}
