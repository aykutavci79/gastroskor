import { useState } from 'react';

import { GourmetProfileSetupModal } from '@/components/GourmetProfileSetupModal';
import { useSession } from '@/context/session-context';

/** Ilk giris sonrasi takma ad zorunlulugu — tum sekmelerde calisir. */
export function GourmetProfileGate() {
  const { user, loading, refreshProfile } = useSession();
  const [dismissed, setDismissed] = useState(false);

  const visible = Boolean(user && user.needsNicknameSetup && !dismissed && !loading);

  return (
    <GourmetProfileSetupModal
      visible={visible}
      dismissible
      onDismiss={() => setDismissed(true)}
      onComplete={() => {
        setDismissed(false);
        void refreshProfile();
      }}
    />
  );
}
