import { useEffect, useState } from 'react';
import { Checkbox, Input, Modal } from 'antd';
import { useStore, useViewer } from '../viewer';
import { S } from '../strings';

export function AuthorDialog({ open, onClose }: { open: boolean; onClose(saved: boolean): void }) {
  const { bcf } = useViewer();
  const { author } = useStore(bcf.store);
  const [value, setValue] = useState(author);
  const [remember, setRemember] = useState(true);
  // Reset when opened (not after the open animation, which would wipe what the user already typed).
  useEffect(() => { if (open) setValue(author); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Modal
      open={open}
      title={S.bcf.authorTitle}
      okButtonProps={{ disabled: !value.trim() }}
      onOk={() => { bcf.setAuthor(value.trim(), remember); onClose(true); }}
      onCancel={() => onClose(false)}
      destroyOnHidden
    >
      <p className="text-neutral-500">{S.bcf.authorMessage}</p>
      <Input autoFocus placeholder={S.bcf.authorPlaceholder} value={value} onChange={(e) => setValue(e.target.value)} onPressEnter={() => value.trim() && (bcf.setAuthor(value.trim(), remember), onClose(true))} />
      <Checkbox className="mt-3" checked={remember} onChange={(e) => setRemember(e.target.checked)}>{S.bcf.authorRemember}</Checkbox>
    </Modal>
  );
}
