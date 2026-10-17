import { Modal, Upload } from 'antd';
import { InboxOutlined, CheckOutlined } from '@ant-design/icons';
import { useViewer } from './viewer';
import { S } from './strings';

// Local testing: VITE_EXAMPLE=crais in .env.local (gitignored) loads the reference viewer's example files from
// test-fixtures/crais via the dev-only /local-fixtures route. They are not ours to ship, so never in builds.
const CRAIS = import.meta.env.DEV && import.meta.env.VITE_EXAMPLE === 'crais';
const CRAIS_BASE = '/local-fixtures/crais/';
export const EXAMPLE_MODELS = CRAIS
  ? ['example-arc', 'example-mep', 'example-str'].map((n) => `${CRAIS_BASE}${n}.frag`)
  : ['arc', 'str', 'ele', 'hvac'].map((n) => `/examples/office_${n}.frag`);
const EXAMPLE_BCF = CRAIS ? `${CRAIS_BASE}example-bcf.bcfzip` : '/examples/demo.bcfzip';

interface WelcomeModalProps {
  open: boolean;
  onClose(): void;
}

export function WelcomeModal({ open, onClose }: WelcomeModalProps) {
  const { models, bcf } = useViewer();
  const loadExample = async () => {
    onClose();
    await models.loadUrls(EXAMPLE_MODELS);
    const blob = await (await fetch(EXAMPLE_BCF)).blob();
    await bcf.importFile(new File([blob], 'demo.bcfzip'));
  };
  return (
    <Modal open={open} onCancel={onClose} footer={null} width={660} centered>
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <h1 className="m-0 text-3xl font-bold">{S.welcome.title}</h1>
        <div className="text-neutral-500">{S.welcome.intro.map((l) => <p key={l} className="m-0">{l}</p>)}</div>
        <div className="grid w-full grid-cols-2 gap-4">
          <div>
            <h3 className="mb-2 font-semibold">{S.welcome.load}</h3>
            <Upload.Dragger
              className="block"
              height={180}
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
              className="h-[180px] w-full cursor-pointer rounded-lg border border-dashed border-neutral-300 bg-transparent text-4xl hover:border-[var(--brand)]"
              aria-label={S.welcome.example}
              onClick={loadExample}
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
