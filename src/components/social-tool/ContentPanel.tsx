"use client";

import { AlignCenter, AlignLeft, AlignRight, Plus, Trash2 } from "lucide-react";
import { Button, Label, Switch, TextArea, TextField } from "@heroui/react";
import {
  InspectorSegment,
  InspectorSelect,
  InspectorSlider,
} from "@/components/social-tool/InspectorControls";
import {
  SOCIAL_FONTS,
  type PostCopy,
  type SocialFontId,
  type TextAlign,
} from "@/lib/social-tool/presets";

const ALIGN_OPTIONS = [
  { id: "left", label: "Left", icon: AlignLeft },
  { id: "center", label: "Center", icon: AlignCenter },
  { id: "right", label: "Right", icon: AlignRight },
] as const;

type Props = {
  showContent: boolean;
  onShowContentChange: (value: boolean) => void;
  copy: PostCopy;
  onUpdateField: <K extends keyof PostCopy>(key: K, value: PostCopy[K]) => void;
  onAddExtraField: () => void;
  onRemoveExtraField: (id: string) => void;
  onUpdateExtraField: (id: string, value: string) => void;
  textAlign: TextAlign;
  onTextAlignChange: (value: TextAlign) => void;
  headingFont: SocialFontId;
  onHeadingFontChange: (value: SocialFontId) => void;
  subFont: SocialFontId;
  onSubFontChange: (value: SocialFontId) => void;
  typeScale: number;
  onTypeScaleChange: (value: number) => void;
};

export function ContentPanel({
  showContent,
  onShowContentChange,
  copy,
  onUpdateField,
  onAddExtraField,
  onRemoveExtraField,
  onUpdateExtraField,
  textAlign,
  onTextAlignChange,
  headingFont,
  onHeadingFontChange,
  subFont,
  onSubFontChange,
  typeScale,
  onTypeScaleChange,
}: Props) {
  return (
    <section className="social-tool-section space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="social-tool-section-title !mb-0">Content</p>
        <Switch
          size="sm"
          isSelected={showContent}
          onChange={onShowContentChange}
          aria-label="Show content on canvas"
        >
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Content>
        </Switch>
      </div>

      {showContent ? (
        <>
          <TextField
            fullWidth
            name="heading"
            value={copy.heading}
            onChange={(v) => onUpdateField("heading", v)}
          >
            <Label className="social-tool-label">Heading</Label>
            <TextArea rows={3} className="min-h-[4.5rem] resize-y" />
          </TextField>
          <p className="text-[11px] leading-4 text-text-tertiary">
            Optional: wrap accent phrases in [[double brackets]] in the headline.
          </p>
          <TextField
            fullWidth
            name="subheading"
            value={copy.subheading}
            onChange={(v) => onUpdateField("subheading", v)}
          >
            <Label className="social-tool-label">Subheading</Label>
            <TextArea rows={3} className="min-h-[4.5rem] resize-y" />
          </TextField>

          {copy.extraFields.map((field, idx) => (
            <div key={field.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="social-tool-label !mb-0">Extra {idx + 1}</span>
                <Button
                  size="sm"
                  variant="outline"
                  isIconOnly
                  aria-label={`Remove field ${idx + 1}`}
                  onPress={() => onRemoveExtraField(field.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <TextField
                fullWidth
                value={field.value}
                onChange={(v) => onUpdateExtraField(field.id, v)}
              >
                <TextArea
                  rows={2}
                  className="min-h-[3rem] resize-y"
                  placeholder="Additional line…"
                />
              </TextField>
            </div>
          ))}

          <Button fullWidth variant="outline" onPress={onAddExtraField}>
            <Plus className="size-4" />
            Add field
          </Button>

          <div className="copy-typography-block space-y-3">
            <div className="social-tool-row">
              <span className="social-tool-row-label">Align</span>
              <InspectorSegment
                aria-label="Text alignment"
                value={textAlign}
                onChange={(v) => onTextAlignChange(v as TextAlign)}
                options={[...ALIGN_OPTIONS]}
              />
            </div>
            <InspectorSelect
              label="Heading font"
              value={headingFont}
              onChange={(v) => onHeadingFontChange(v as SocialFontId)}
              options={SOCIAL_FONTS.map((f) => ({
                id: f.id,
                label: f.label,
                description: f.token,
              }))}
            />
            <InspectorSelect
              label="Subheading font"
              value={subFont}
              onChange={(v) => onSubFontChange(v as SocialFontId)}
              options={SOCIAL_FONTS.map((f) => ({
                id: f.id,
                label: f.label,
                description: f.token,
              }))}
            />
            <InspectorSlider
              label="Scale"
              value={typeScale}
              onChange={onTypeScaleChange}
              min={0.75}
              max={4}
              step={0.05}
              format={(v) =>
                `${v.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}×`
              }
              aria-label="Content text scale"
            />
          </div>
        </>
      ) : null}
    </section>
  );
}
