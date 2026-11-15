{{- define "service-chart.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "service-chart.fullname" -}}
{{- printf "%s-%s" .Release.Name (include "service-chart.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "service-chart.selectorLabels" -}}
app.kubernetes.io/name: {{ include "service-chart.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "service-chart.labels" -}}
{{ include "service-chart.selectorLabels" . }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "service-chart.serviceAccountName" -}}
{{- required "serviceAccount.name must identify an existing or chart-created ServiceAccount" .Values.serviceAccount.name -}}
{{- end -}}
