interface Props {
  primary: string;
  secondary?: string | null;
  primaryClassName?: string;
  secondaryClassName?: string;
}

export function DestinationDisplayLabel({
  primary,
  secondary,
  primaryClassName = "dash-home-programme__destination",
  secondaryClassName = "dash-home-programme__destination-sub",
}: Props) {
  return (
    <>
      <p className={primaryClassName}>{primary}</p>
      {secondary ? (
        <p className={secondaryClassName}>{secondary}</p>
      ) : null}
    </>
  );
}
