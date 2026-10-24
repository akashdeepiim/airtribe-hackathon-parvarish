import { PublicPage, PageMeta } from '../components/marketing/WebShell.web';
import { Education } from '../components/Education';
export default function Guidance() {
  return (
    <PublicPage>
      <PageMeta
        title="Health education, clearly sourced — Parvarish"
        path="/guidance"
        description="Public educational guidance for parents, with direct WHO, CDC and Government of India source links."
      />
      <div className="p-container" style={{ maxWidth: 960, paddingTop: 64, paddingBottom: 80 }}>
        <Education />
      </div>
    </PublicPage>
  );
}
