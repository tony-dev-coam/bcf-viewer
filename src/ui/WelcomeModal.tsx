import { Modal, Upload } from 'antd';
import { InboxOutlined, CheckOutlined } from '@ant-design/icons';
import { useViewer } from './viewer';
import { S } from './strings';

export const EXAMPLE_MODELS = ['/examples/school_str.ifc'];

export function WelcomeModal({ open, onClose }: { open: boolean; onClose(): void }) {
  const { models } = useViewer();
  return (
    <Modal open={open} onCancel={onClose} footer={null} width={660} centered>
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <h1 className="m-0 text-3xl font-bold">{S.welcome.title}</h1>
        <div className="text-neutral-500">{S.welcome.intro.map((l) => <p key={l} className="m-0">{l}</p>)}</div>
        <div className="grid w-full grid-cols-2 gap-4">
          <div>
            <h3 className="mb-2 font-semibold">{S.welcome.load}</h3>
            <Upload.Dragger
              multiple
              accept=".ifc,.frag"
              showUploadList={false}
              beforeUpload={(_f, files) => {
                if (_f === files[0]) { models.load(files); onClose(); }
                return false; // never upload: files stay in the browser (FM-05)
              }}
            >
              <p className="text-3xl"><InboxOutlined /></p>
              <p className="font-medium">{S.welcome.drop}</p>
              <p className="text-xs text-neutral-500">{S.welcome.browse}</p>
            </Upload.Dragger>
          </div>
          <div>
            <h3 className="mb-2 font-semibold">{S.welcome.example}</h3>
            <button
              className="h-[164px] w-full cursor-pointer rounded-lg border border-dashed border-neutral-300 bg-transparent text-4xl hover:border-[var(--brand)]"
              aria-label={S.welcome.example}
              onClick={() => { models.loadUrls(EXAMPLE_MODELS); onClose(); }}
            >
              🏢
            </button>
          </div>
        </div>
        <ul className="m-0 grid list-none grid-cols-2 gap-x-8 gap-y-1 p-0 text-left text-sm">
          {S.welcome.features.map((f) => <li key={f}><CheckOutlined className="mr-2 text-[var(--brand)]" />{f}</li>)}
        </ul>
      </div>
    </Modal>
  );
}
