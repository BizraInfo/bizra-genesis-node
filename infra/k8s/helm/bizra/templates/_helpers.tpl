{{/*
Expand the name of the chart.
*/}}
{{- define "bizra-genesis-node.name" -}}
{{- default .Chart.Name .Values.global.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "bizra-genesis-node.fullname" -}}
{{- if .Values.global.fullnameOverride }}
{{- .Values.global.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.global.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "bizra-genesis-node.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "bizra-genesis-node.labels" -}}
helm.sh/chart: {{ include "bizra-genesis-node.chart" . }}
{{ include "bizra-genesis-node.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: {{ include "bizra-genesis-node.name" . }}
environment: {{ .Values.global.environment }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "bizra-genesis-node.selectorLabels" -}}
app.kubernetes.io/name: {{ include "bizra-genesis-node.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app: {{ include "bizra-genesis-node.name" . }}
component: core-system
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "bizra-genesis-node.serviceAccountName" -}}
{{- if .Values.global.serviceAccount.create }}
{{- default (include "bizra-genesis-node.fullname" .) .Values.global.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.global.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Create the name of the configmap to use
*/}}
{{- define "bizra-genesis-node.configMapName" -}}
{{- printf "%s-config" (include "bizra-genesis-node.fullname" .) }}
{{- end }}

{{/*
Create the name of the secret to use
*/}}
{{- define "bizra-genesis-node.secretName" -}}
{{- printf "%s-secrets" (include "bizra-genesis-node.fullname" .) }}
{{- end }}

{{/*
Create the name of the PVC to use
*/}}
{{- define "bizra-genesis-node.pvcName" -}}
{{- printf "%s-pvc" (include "bizra-genesis-node.fullname" .) }}
{{- end }}

{{/*
Create the name of the service to use
*/}}
{{- define "bizra-genesis-node.serviceName" -}}
{{- printf "%s-service" (include "bizra-genesis-node.fullname" .) }}
{{- end }}

{{/*
Create the name of the HPA to use
*/}}
{{- define "bizra-genesis-node.hpaName" -}}
{{- printf "%s-hpa" (include "bizra-genesis-node.fullname" .) }}
{{- end }}

{{/*
Create the name of the PDB to use
*/}}
{{- define "bizra-genesis-node.pdbName" -}}
{{- printf "%s-pdb" (include "bizra-genesis-node.fullname" .) }}
{{- end }}

{{/*
Create the name of the Istio Gateway to use
*/}}
{{- define "bizra-genesis-node.gatewayName" -}}
{{- printf "%s-gateway" (include "bizra-genesis-node.fullname" .) }}
{{- end }}

{{/*
Create the name of the Istio VirtualService to use
*/}}
{{- define "bizra-genesis-node.virtualServiceName" -}}
{{- printf "%s-virtualservice" (include "bizra-genesis-node.fullname" .) }}
{{- end }}

{{/*
Create the name of the Istio DestinationRule to use
*/}}
{{- define "bizra-genesis-node.destinationRuleName" -}}
{{- printf "%s-destinationrule" (include "bizra-genesis-node.fullname" .) }}
{{- end }}

{{/*
Create the name of the NetworkPolicy to use
*/}}
{{- define "bizra-genesis-node.networkPolicyName" -}}
{{- printf "%s-network-policy" (include "bizra-genesis-node.fullname" .) }}
{{- end }}

{{/*
Generate database URL from values
*/}}
{{- define "bizra-genesis-node.databaseUrl" -}}
{{- if .Values.database.enabled }}
{{- printf "postgresql://%s:%s@%s:%d/%s?sslmode=%s"
    .Values.database.username
    .Values.database.password
    .Values.database.host
    .Values.database.port
    .Values.database.database
    .Values.database.sslMode }}
{{- end }}
{{- end }}

{{/*
Generate Redis URL from values
*/}}
{{- define "bizra-genesis-node.redisUrl" -}}
{{- if .Values.redis.enabled }}
{{- if .Values.redis.password }}
{{- printf "redis://:%s@%s:%d/%d"
    .Values.redis.password
    .Values.redis.host
    .Values.redis.port
    .Values.redis.database }}
{{- else }}
{{- printf "redis://%s:%d/%d"
    .Values.redis.host
    .Values.redis.port
    .Values.redis.database }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Generate API base URLs
*/}}
{{- define "bizra-genesis-node.anthropicBaseUrl" -}}
{{- default "https://api.anthropic.com" .Values.apis.anthropic.baseUrl }}
{{- end }}

{{- define "bizra-genesis-node.openaiBaseUrl" -}}
{{- default "https://api.openai.com/v1" .Values.apis.openai.baseUrl }}
{{- end }}

{{/*
Common annotations for resources
*/}}
{{- define "bizra-genesis-node.annotations" -}}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: {{ include "bizra-genesis-node.name" . }}
helm.sh/chart: {{ include "bizra-genesis-node.chart" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
{{- end }}

{{/*
Resource validation
*/}}
{{- define "bizra-genesis-node.validateValues" -}}
{{- $errors := list -}}
{{- if and .Values.database.enabled (not .Values.database.host) -}}
{{- $errors = append $errors "database.host is required when database.enabled is true" -}}
{{- end -}}
{{- if and .Values.redis.enabled (not .Values.redis.host) -}}
{{- $errors = append $errors "redis.host is required when redis.enabled is true" -}}
{{- end -}}
{{- if $errors -}}
{{- printf "\nVALIDATION ERRORS:\n%s" (join "\n" $errors) | fail -}}
{{- end -}}
{{- end -}}

{{/*
Call validation
*/}}
{{- include "bizra-genesis-node.validateValues" . }}
