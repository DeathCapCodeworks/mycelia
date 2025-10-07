import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { VaultGrantButton, OracleSearchBox, WorkspaceSwitcher, RewardsEarningsCard, GraphPermissionPanel } from './index';

describe('UI Components', () => {
  it('renders VaultGrantButton', () => {
    const { getByText } = render(<VaultGrantButton onGrant={() => {}} />);
    expect(getByText('Grant Vault Access')).toBeDefined();
  });

  it('renders OracleSearchBox', () => {
    const { getByPlaceholderText } = render(<OracleSearchBox onQuery={() => {}} />);
    expect(getByPlaceholderText('Search')).toBeDefined();
  });

  it('renders WorkspaceSwitcher', () => {
    const { getByDisplayValue } = render(<WorkspaceSwitcher value="Work" onChange={() => {}} />);
    expect(getByDisplayValue('Work')).toBeDefined();
  });

  it('renders RewardsEarningsCard', () => {
    const { container } = render(<RewardsEarningsCard epoch="2025-Q4" amount={0.1234} />);
    expect(container.textContent).toContain('2025-Q4');
    expect(container.textContent).toContain('earnings');
  });

  it('renders GraphPermissionPanel', () => {
    const { getByText } = render(<GraphPermissionPanel onGrant={() => {}} onRevoke={() => {}} />);
    expect(getByText('Grant Read')).toBeDefined();
    expect(getByText('Revoke')).toBeDefined();
  });
});
