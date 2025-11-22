import React from 'react';

export default function CountsBar({ summary, loading }: { summary: { critical: number; warning: number; info: number }; loading?: boolean }) {
    return (
        <div className="counts">
            <div className="count card">
                <div className="num">{loading ? '…' : summary.critical}</div>
                <div className="label">CRITICAL</div>
            </div>
            <div className="count card">
                <div className="num">{loading ? '…' : summary.warning}</div>
                <div className="label">WARNING</div>
            </div>
            <div className="count card">
                <div className="num">{loading ? '…' : summary.info}</div>
                <div className="label">INFO</div>
            </div>
        </div>
    );
}
