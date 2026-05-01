import { useState } from 'react';

function usePersistentState(_key, initialValue) {
  return useState(initialValue);
}

export default usePersistentState;
