import { render } from '@testing-library/react';

import OrgVectorStore from './vector-store';

describe('OrgVectorStore', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<OrgVectorStore />);
    expect(baseElement).toBeTruthy();
  });
});
