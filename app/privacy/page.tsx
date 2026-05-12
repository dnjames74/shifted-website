const sectionStyle = { marginTop: 28 };
const listStyle = { paddingLeft: 22, lineHeight: 1.7 };

export default function PrivacyPage() {
  return (
    <main
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: 24,
        color: "#e5e7eb",
        lineHeight: 1.6,
      }}
    >
      <h1>Privacy Policy</h1>
      <p>
        <strong>Effective Date:</strong> May 12, 2026
      </p>

      <p>
        Shifted Dating ("Shifted", "we", "our", or "us") respects your
        privacy. This Privacy Policy explains how we collect, use, disclose,
        and protect information when you use our website, mobile application,
        waitlist, support channels, and related services.
      </p>

      <p>
        Shifted is designed for adults who work shifts or keep non-traditional
        schedules. By using Shifted, you understand that some profile
        information you choose to provide may be visible to other users as part
        of the dating experience.
      </p>

      <section style={sectionStyle}>
        <h2>Information We Collect</h2>
        <p>We may collect the following categories of information:</p>
        <ul style={listStyle}>
          <li>
            <strong>Account information:</strong> email address, authentication
            details, account identifiers, and account status.
          </li>
          <li>
            <strong>Profile information:</strong> name, username, photos, bio,
            city, region, country, dating intent, shift type, schedule
            preferences, likes, avoids, dealbreakers, and other information you
            choose to add to your profile.
          </li>
          <li>
            <strong>App activity:</strong> matches, likes, profile views or
            interactions, blocks, reports, support requests, notification
            preferences, and similar in-app activity.
          </li>
          <li>
            <strong>Messages:</strong> chat content, timestamps, sender and
            receiver identifiers, read status, and message metadata needed to
            operate the messaging feature.
          </li>
          <li>
            <strong>Photos and media:</strong> profile photos and other images
            you upload to the service.
          </li>
          <li>
            <strong>Location-related information:</strong> location fields you
            manually provide, such as city, region, country, and distance
            preferences. If the app requests device location permission, we use
            it only as described at the time of request.
          </li>
          <li>
            <strong>Device and technical information:</strong> device type,
            operating system, app version, IP address, browser or device user
            agent, diagnostics, crash or error information, and push
            notification tokens.
          </li>
          <li>
            <strong>Purchase information:</strong> premium subscription status,
            product identifiers, and related entitlement information. Payments
            are processed by Apple, and we do not receive your full payment card
            details.
          </li>
          <li>
            <strong>Waitlist and website information:</strong> email address,
            city, shift-worker status, referral or campaign data, IP address,
            and browser user agent when you use our website or join our
            waitlist.
          </li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2>How We Use Information</h2>
        <p>We use information to:</p>
        <ul style={listStyle}>
          <li>Create, authenticate, and maintain user accounts.</li>
          <li>Show profiles, matches, messages, likes, and app features.</li>
          <li>Provide dating, discovery, compatibility, and premium features.</li>
          <li>Send push notifications about matches, messages, and account activity.</li>
          <li>Process support requests, reports, blocks, and safety reviews.</li>
          <li>Prevent fraud, spam, misuse, abuse, and unauthorized access.</li>
          <li>Improve, troubleshoot, test, and secure Shifted.</li>
          <li>Communicate product updates, early access information, and service notices.</li>
          <li>Comply with legal obligations and enforce our Terms of Service.</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2>Information Other Users Can See</h2>
        <p>
          Dating apps require some information to be shared with other users.
          Depending on your settings and app features, other users may see your
          profile photos, username, bio, general location fields, schedule or
          shift-related preferences, dating intent, likes, avoids, and other
          profile details you choose to provide. Users you match or communicate
          with may also see messages you send them.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Service Providers</h2>
        <p>
          We use service providers to operate Shifted. These may include
          Supabase for authentication, database, storage, and backend services;
          Expo for push notifications and app infrastructure; Apple for App
          Store distribution, subscriptions, and payments; Vercel for website
          hosting; and email or support tools used to communicate with users.
          These providers may process information on our behalf as needed to
          provide their services.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Legal, Safety, and Moderation Disclosures</h2>
        <p>
          We may access, preserve, review, or disclose information if we believe
          it is reasonably necessary to investigate safety concerns, enforce our
          rules, respond to reports, protect users, prevent fraud or abuse,
          comply with law, or respond to lawful requests from public
          authorities.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Data Retention</h2>
        <p>
          We keep information for as long as reasonably needed to provide the
          service, maintain security, resolve disputes, enforce agreements,
          comply with legal obligations, and support legitimate business needs.
          Some information may remain in backups, logs, fraud-prevention
          records, support records, or safety records for a limited period after
          account deletion.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Your Choices and Rights</h2>
        <p>
          You may update much of your profile information in the app. You may
          request access, correction, or deletion of your information by
          contacting us. You can also request account deletion from within the
          app where available. You may manage push notifications through the app
          and your device settings. You may unsubscribe from marketing or
          waitlist emails at any time.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Children</h2>
        <p>
          Shifted is intended only for adults who are at least 18 years old. We
          do not knowingly collect information from anyone under 18. If you
          believe a minor has used Shifted, contact us so we can review and take
          appropriate action.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Security</h2>
        <p>
          We use reasonable administrative, technical, and organizational
          safeguards designed to protect information. No method of transmission
          or storage is completely secure, and we cannot guarantee absolute
          security.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>International Use</h2>
        <p>
          If you use Shifted from outside the country where our systems or
          providers operate, your information may be processed in other
          jurisdictions with different data protection laws.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. If we make
          material changes, we will update the effective date and may provide
          additional notice through the app, website, or email.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Contact</h2>
        <p>
          If you have questions or requests, contact us at{" "}
          <a href="mailto:support@shifteddating.com" style={{ color: "#86efac" }}>
            support@shifteddating.com
          </a>
          .
        </p>
      </section>
    </main>
  );
}
