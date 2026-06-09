import { Composition } from "remotion"
import { PayplayShortform, PayplayShortformDefaults } from "./compositions/PayplayShortform"

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="PayplayShortform"
        component={PayplayShortform}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={PayplayShortformDefaults}
      />
    </>
  )
}
