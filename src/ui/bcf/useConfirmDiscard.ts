import { App } from 'antd';
import { useViewer } from '../viewer';
import { S } from '../strings';

/** BT-07: ask before an action would drop a dirty topic session. Resolves true when it's fine to continue. */
export function useConfirmDiscard() {
  const { modal } = App.useApp();
  const { bcf } = useViewer();
  return () =>
    new Promise<boolean>((resolve) => {
      if (!bcf.store.getSnapshot().session?.dirty) return resolve(true);
      modal.confirm({
        title: S.bcf.discardTitle,
        content: S.bcf.discardMessage,
        okText: S.bcf.discard,
        okButtonProps: { danger: true },
        cancelText: S.bcf.keepEditing,
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
}
