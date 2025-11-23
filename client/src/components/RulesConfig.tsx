import React from 'react';

interface RulesConfigProps {
  rules: Record<string, any>;
  onReload: () => void;
  canReload: boolean;
}

export default function RulesConfig({ rules, onReload, canReload }: RulesConfigProps) {
  const rulesArray = rules?.rules || [];
  const escalation = rules?.escalation || {};
  const autoClose = rules?.auto_close || {};
  const isNewFormat = Array.isArray(rulesArray) && rulesArray.length > 0;

  return (
    <div>
      <div className="row" style={{ justifyContent:'space-between', alignItems:'center', marginBottom: 8 }}>
        <h4 style={{ margin:'4px 0' }}>Active Rules ({isNewFormat ? rulesArray.length : Object.keys(rules).length})</h4>
        {canReload && <button className="btn small" onClick={onReload}>Reload Rules</button>}
      </div>
      
      {isNewFormat ? (
        <div style={{ maxHeight: 400, overflow: 'auto' }}>
          <div style={{ marginBottom: 16 }}>
            <h5 style={{ margin: '8px 0 4px' }}>Alert Generation Rules</h5>
            <div style={{ display: 'grid', gap: 8 }}>
              {rulesArray.map((rule: any) => (
                <div key={rule.ruleId} style={{ 
                  background: '#fafafa', 
                  padding: 8, 
                  border: '1px solid #eee',
                  borderRadius: 4 
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <strong>{rule.name}</strong>
                    <span className={`badge ${rule.severity}`}>{rule.severity}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    <div>Type: <code>{rule.eventTypes?.join(', ')}</code></div>
                    <div>Condition: <code>{JSON.stringify(rule.condition)}</code></div>
                    {rule.description && <div style={{ marginTop: 4, fontStyle: 'italic' }}>{rule.description}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {Object.keys(escalation).length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h5 style={{ margin: '8px 0 4px' }}>Escalation Rules</h5>
              <pre style={{ background: '#fafafa', padding: 8, border: '1px solid #eee', fontSize: 12 }}>
                {JSON.stringify(escalation, null, 2)}
              </pre>
            </div>
          )}

          {Object.keys(autoClose).length > 0 && (
            <div>
              <h5 style={{ margin: '8px 0 4px' }}>Auto-Close Rules</h5>
              <pre style={{ background: '#fafafa', padding: 8, border: '1px solid #eee', fontSize: 12 }}>
                {JSON.stringify(autoClose, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ) : (
        <pre style={{ maxHeight: 160, overflow: 'auto', background: '#fafafa', padding: 8, border: '1px solid #eee' }}>
          {JSON.stringify(rules, null, 2)}
        </pre>
      )}
    </div>
  );
}
