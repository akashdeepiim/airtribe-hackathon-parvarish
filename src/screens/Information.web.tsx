import { PageMeta, PublicPage } from '../components/marketing/WebShell.web';
import { Arrow } from '../components/marketing/Illustrations.web';
import { z } from 'zod';
const contact = z.object({ email: z.email(), operator: z.string().min(2) }).safeParse({
  email: process.env.EXPO_PUBLIC_SUPPORT_EMAIL,
  operator: process.env.EXPO_PUBLIC_OPERATOR_NAME,
});
export function PrivacyPage() {
  return (
    <PublicPage>
      <PageMeta
        title="Your family's privacy — Parvarish"
        path="/privacy"
        description="Your family, your circle, your choices. How the current Parvarish experience handles personal information."
      />
      <div className="p-container">
        <header className="p-page-intro">
          <span className="p-eyebrow">OUR PRIVACY PROMISE</span>
          <h1>
            Close to your heart.
            <br />
            <em>Kept close.</em>
          </h1>
          <p>Parenthood is personal. The choices about your family’s space belong to you.</p>
        </header>
        <div className="p-plain-content">
          <p className="p-inline-note">
            This is an early version of Parvarish. Use demonstration information while the hosted
            service and account export/deletion tools are being completed.
          </p>
          <h2>Explore without telling us your stage.</h2>
          <p>
            The public journey and journal do not require an account. Selecting “Dreaming” or
            “Expecting” changes this page only. We do not save a pregnancy status, due date or
            family-planning profile. No advertising or analytics trackers are enabled in this
            version.
          </p>
          <h2>A choice for each purpose.</h2>
          <p>
            Creating a child profile begins with five separate choices: memories, milestones,
            health, personalisation and notifications. Memories is required for a child profile. The
            other four are optional. You can review and withdraw your choices from your family
            space.
          </p>
          <h2>Your circle has boundaries.</h2>
          <p>
            Family invitations are tied to the recipient’s verified email. The owner chooses what
            each person can see and change. Health access is restricted to parents unless the owner
            explicitly grants someone else read access. Health reads and changes are recorded in an
            access log.
          </p>
          <h2>Private pictures stay private.</h2>
          <p>
            Profile images are kept in private storage. Viewing links expire after 15 minutes.
            Removing a person’s access prevents new viewing links; a link already issued can remain
            valid until it expires. A copy someone has already downloaded cannot be recalled.
          </p>
          <h2>The information used here.</h2>
          <p>
            Email is used to sign in. A child profile includes their name, date of birth, city,
            optional interests, optional sex and an optional photograph. Sex is not used to choose
            activities. Consent decisions and family permissions are stored with the account. The
            public journal does not contain clinical advice.
          </p>
          <h2>Changing your mind.</h2>
          <p>
            In your child’s space, open “Privacy choices” to change a purpose. Withdrawal stops
            access or processing for that purpose; it does not itself delete the data. Export, full
            deletion, storage cleanup and deletion receipts are part of the planned launch work and
            are not available in this early interface.
          </p>
          <h2>Before public launch.</h2>
          <p>
            The live service’s operator details, support and privacy contact, retention schedule and
            final notice will be published here before real family information is collected. The
            development version is not a substitute for that final notice.
          </p>
          {contact.success ? (
            <>
              <h2>Talk with us.</h2>
              <p>
                Parvarish is operated by {contact.data.operator}. For support or privacy questions,
                email <a href={`mailto:${contact.data.email}`}>{contact.data.email}</a>.
              </p>
            </>
          ) : null}
          <a className="p-text-link" href="/family">
            Your family’s choices
            <Arrow />
          </a>
        </div>
      </div>
    </PublicPage>
  );
}
export function AboutPage() {
  return (
    <PublicPage>
      <PageMeta
        title="Why Parvarish exists — Parvarish"
        path="/about"
        description="A little space for the biggest journey. The idea, the current version and what comes next."
      />
      <div className="p-container">
        <header className="p-page-intro">
          <span className="p-eyebrow">HELLO, WE’RE PARVARISH.</span>
          <h1>
            Growing a family.
            <br />
            <em>Finding your way.</em>
          </h1>
          <p>
            There is a child growing up. And a parent growing alongside them. We want to make room
            for both stories.
          </p>
        </header>
        <div className="p-plain-content">
          <h2>For the beautiful, ordinary middle.</h2>
          <p>
            Family life is full of photographs, tiny firsts and questions you did not know you would
            ask. Parvarish is being built to connect those moments, with your family’s memories at
            the heart of it.
          </p>
          <p>
            We are starting in Bangalore, in English. Our public journeys begin with the thought of
            a family and continue through pregnancy and the first five years. Child profiles begin
            after birth.
          </p>
          <h2>A small beginning, thoughtfully built.</h2>
          <p>
            Today, you can explore the journal, sign in with an email code, create a private profile
            and invite your people with individual access settings. Separate consent choices keep
            you in control of each purpose.
          </p>
          <h2>What is growing next.</h2>
          <p>
            Memory timelines will connect with parent-confirmed firsts. Reviewed milestone content
            and gentle activity ideas will follow. These features are still being built; clinical
            content will appear only after approval. We do not provide fertility, pregnancy or
            medical advice.
          </p>
          <h2>Web first. Then, in your pocket.</h2>
          <p>
            We are shaping the experience on the web first. iOS and Android experiences will follow
            once the design and flow are settled.
          </p>
          <a className="p-button p-button-dark" href="/#journey">
            Find your chapter
            <Arrow />
          </a>
        </div>
      </div>
    </PublicPage>
  );
}
