<template>
  <div class="capability-type-data">

    <LabeledInput
      :formstate="formstate"
      :name="`capability${capability.uuid}-${capability.typeData.effectNameOrPreset}`">

      <template #label>
        <template v-if="capability.typeData.effectNameOrPreset === `effectName`">
          Effect name / <a
            href="#effectPreset"
            class="button secondary inline"
            title="Choose effect preset instead of entering effect name manually"
            @click.prevent="changeEffectNameOrPreset(`effectPreset`)">preset</a>
        </template>
        <template v-else>
          Effect preset / <a
            href="#effectName"
            class="button secondary inline"
            title="Specify effect name manually instead of choosing effect preset"
            @click.prevent="changeEffectNameOrPreset(`effectName`)">name</a>
        </template>
      </template>

      <PropertyInputText
        v-if="capability.typeData.effectNameOrPreset === `effectName`"
        ref="effectNameOrPresetInput"
        v-model="capability.typeData.effectName"
        :formstate="formstate"
        :name="`capability${capability.uuid}-effectName`"
        :schema-property="properties.definitions.nonEmptyString"
        :required="true" />

      <select
        v-else
        ref="effectNameOrPresetInput"
        v-model="capability.typeData.effectPreset"
        :class="{ empty: capability.typeData.effectPreset === `` }"
        :name="`capability${capability.uuid}-effectPreset`"
        required>

        <option value="" disabled>Please select an effect preset</option>
        <option
          v-for="effect in effectPresets"
          :key="effect"
          :value="effect">{{ effect }}</option>

      </select>

    </LabeledInput>

    <LabeledInput
      :formstate="formstate"
      :multiple-inputs="true"
      :name="`capability${capability.uuid}-speed`"
      label="Speed">
      <EditorProportionalPropertySwitcher
        :capability="capability"
        :formstate="formstate"
        property-name="speed" />
    </LabeledInput>

    <LabeledInput
      :formstate="formstate"
      :multiple-inputs="true"
      :name="`capability${capability.uuid}-duration`"
      label="Duration">
      <EditorProportionalPropertySwitcher
        :capability="capability"
        :formstate="formstate"
        property-name="duration" />
    </LabeledInput>

    <LabeledInput
      :formstate="formstate"
      :multiple-inputs="true"
      :name="`capability${capability.uuid}-parameter`"
      label="Parameter">
      <EditorProportionalPropertySwitcher
        :capability="capability"
        :formstate="formstate"
        property-name="parameter" />
    </LabeledInput>

    <LabeledInput
      :formstate="formstate"
      :name="`capability${capability.uuid}-soundControlled`"
      label="Sound-controlled?">
      <PropertyInputBoolean
        v-model="capability.typeData.soundControlled"
        :schema-property="properties.capabilityTypes.Effect.properties.soundControlled"
        :name="`capability${capability.uuid}-soundControlled`"
        label="Effect is sound-controlled" />
    </LabeledInput>

    <LabeledInput
      v-if="capability.typeData.soundControlled"
      :formstate="formstate"
      :multiple-inputs="true"
      :name="`capability${capability.uuid}-soundSensitivity`"
      label="Sound sensitivity">
      <EditorProportionalPropertySwitcher
        :capability="capability"
        :formstate="formstate"
        property-name="soundSensitivity" />
    </LabeledInput>

    <LabeledInput
      :formstate="formstate"
      :name="`capability${capability.uuid}-comment`"
      label="Comment">
      <PropertyInputText
        v-model="capability.typeData.comment"
        :formstate="formstate"
        :name="`capability${capability.uuid}-comment`"
        :schema-property="properties.definitions.nonEmptyString" />
    </LabeledInput>

  </div>
</template>

<script>
import schemaProperties from '../../../../lib/schema-properties.js';

import EditorProportionalPropertySwitcher from '../EditorProportionalPropertySwitcher.vue';
import LabeledInput from '../../LabeledInput.vue';
import PropertyInputBoolean from '../../PropertyInputBoolean.vue';
import PropertyInputText from '../../PropertyInputText.vue';

export default {
  components: {
    EditorProportionalPropertySwitcher,
    LabeledInput,
    PropertyInputBoolean,
    PropertyInputText,
  },
  props: {
    capability: {
      type: Object,
      required: true,
    },
    formstate: {
      type: Object,
      required: false,
      default: null,
    },
  },
  data() {
    return {
      properties: schemaProperties,
      defaultData: {
        effectNameOrPreset: `effectName`,
        effectName: ``,
        effectPreset: ``,
        speed: ``,
        speedStart: null,
        speedEnd: null,
        duration: ``,
        durationStart: null,
        durationEnd: null,
        parameter: ``,
        parameterStart: null,
        parameterEnd: null,
        soundControlled: null,
        soundSensitivity: ``,
        soundSensitivityStart: null,
        soundSensitivityEnd: null,
        comment: ``,
      },
    };
  },
  computed: {
    effectPresets() {
      return this.properties.definitions.effectPreset.enum;
    },
    resetProps() {
      const resetProps = [this.capability.typeData.effectNameOrPreset === `effectName` ? `effectPreset` : `effectName`];

      if (!this.capability.typeData.soundControlled) {
        resetProps.push(`soundSensitivity`, `soundSensitivityStart`, `soundSensitivityEnd`);
      }

      return resetProps;
    },
  },
  methods: {
    changeEffectNameOrPreset(newValue) {
      this.capability.typeData.effectNameOrPreset = newValue;
      this.$nextTick(() => this.$refs.effectNameOrPresetInput.focus());
    },
  },
};
</script>
