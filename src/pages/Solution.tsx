import { useTranslation } from "react-i18next";
import Section from "../components/Section";
import TutorWidget from "../components/TutorWidget";
import ChapterSummaryPanel from "../components/ChapterSummaryPanel";

const Solution = () => {
  const { t } = useTranslation();
  const features = t("solution.features", { returnObjects: true }) as Array<{
    title: string;
    text: string;
  }>;

  return (
    <>
      <Section title={t("solution.title")}>
        <p>{t("solution.lead")}</p>
        <div className="card-grid">
          {features.map((card) => (
            <div className="card" key={card.title}>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t("solution.tutorTitle")}>
        <TutorWidget />
      </Section>

      <Section title="Chapter Summary Assistant">
        <ChapterSummaryPanel />
      </Section>
    </>
  );
};

export default Solution;
