import { Btn } from "../components/Btn";
import { Card, SectionTitle } from "../components/Card";
import { Icon } from "../components/Icon";

interface PlaceholderProps {
  title: string;
  eyebrow: string;
  description: string;
  comingIn?: string;
  nav?: (route: string, param?: string) => void;
}

export function Placeholder({ title, eyebrow, description, comingIn, nav }: PlaceholderProps) {
  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "34px 40px 60px" }}>
      <SectionTitle eyebrow={eyebrow} title={title} sub={description} />
      <Card pad={42} style={{ textAlign: "center" }}>
        <Icon name="clock" size={32} style={{ color: "var(--gold)", marginBottom: 14 }} />
        <div style={{ color: "var(--txt-mute)", fontSize: 14, marginBottom: 8 }}>
          {comingIn || "This screen lights up in a later milestone."}
        </div>
        {nav && (
          <div style={{ marginTop: 18 }}>
            <Btn kind="ghost" iconR="arrowR" onClick={() => nav("personas")}>
              Browse personas instead
            </Btn>
          </div>
        )}
      </Card>
    </div>
  );
}
