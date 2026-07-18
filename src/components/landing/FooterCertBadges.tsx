import Image from "next/image";

type Props = {
  iso27701Alt: string;
  iso27001Alt: string;
};

export function FooterCertBadges({ iso27701Alt, iso27001Alt }: Props) {
  return (
    <div className="twc-footer-badges" aria-label="Certifications">
      <Image
        src="/image.7f0b3bc9.svg"
        alt={iso27701Alt}
        width={58}
        height={74}
        className="twc-footer-badge"
      />
      <Image
        src="/image.8354ab2c.svg"
        alt={iso27001Alt}
        width={58}
        height={74}
        className="twc-footer-badge"
      />
    </div>
  );
}
